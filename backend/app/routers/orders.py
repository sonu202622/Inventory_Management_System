from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user
from app.database import get_db
from app.models import Customer, Order, OrderItem, OrderStatus, Product
from app.schemas import OrderCreate, OrderResponse, OrderItemResponse

router = APIRouter(prefix="/orders", tags=["Orders"], dependencies=[Depends(get_current_user)])


def _order_to_response(order: Order) -> OrderResponse:
    return OrderResponse(
        id=order.id,
        customer_id=order.customer_id,
        customer_name=order.customer.full_name,
        total_amount=float(order.total_amount),
        status=order.status.value if hasattr(order.status, "value") else str(order.status),
        created_at=order.created_at,
        items=[
            OrderItemResponse(
                product_id=item.product_id,
                product_name=item.product.name,
                quantity=item.quantity,
                unit_price=float(item.unit_price),
                subtotal=round(item.quantity * float(item.unit_price), 2),
            )
            for item in order.items
        ],
    )


@router.get("/", response_model=List[OrderResponse])
async def list_orders(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(
            select(Order)
            .options(selectinload(Order.items).selectinload(OrderItem.product), selectinload(Order.customer))
            .order_by(Order.created_at.desc())
        )
        return [_order_to_response(o) for o in result.scalars().all()]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch orders: {str(e)}",
        )


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(order_id: str, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(
            select(Order)
            .options(selectinload(Order.items).selectinload(OrderItem.product), selectinload(Order.customer))
            .where(Order.id == order_id)
        )
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
            )
        return _order_to_response(order)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch order: {str(e)}",
        )


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(data: OrderCreate, db: AsyncSession = Depends(get_db)):
    try:
        customer = await db.get(Customer, data.customer_id)
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found"
            )

        total = 0.0
        order_items = []

        for item in data.items:
            result = await db.execute(
                select(Product).where(Product.id == item.product_id).with_for_update()
            )
            product = result.scalar_one_or_none()
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product with id '{item.product_id}' not found",
                )
            if product.quantity_in_stock < item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Insufficient stock for product: {product.name}. Available: {product.quantity_in_stock}, Requested: {item.quantity}",
                )

            unit_price = float(product.price)
            subtotal = round(item.quantity * unit_price, 2)
            total += subtotal

            order_items.append(
                OrderItem(
                    product_id=item.product_id,
                    quantity=item.quantity,
                    unit_price=unit_price,
                )
            )
            product.quantity_in_stock -= item.quantity

        order = Order(
            customer_id=data.customer_id,
            total_amount=round(total, 2),
            items=order_items,
        )
        db.add(order)
        await db.commit()

        await db.refresh(order, ["items"])
        result = await db.execute(
            select(Order)
            .options(selectinload(Order.items).selectinload(OrderItem.product), selectinload(Order.customer))
            .where(Order.id == order.id)
        )
        return _order_to_response(result.scalar_one())
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create order: {str(e)}",
        )


@router.delete("/{order_id}", status_code=status.HTTP_200_OK, response_model=OrderResponse)
async def cancel_order(order_id: str, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(
            select(Order)
            .options(selectinload(Order.items).selectinload(OrderItem.product), selectinload(Order.customer))
            .where(Order.id == order_id)
        )
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Order not found"
            )

        if order.status == OrderStatus.CANCELLED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order is already cancelled",
            )

        for item in order.items:
            product_result = await db.execute(
                select(Product).where(Product.id == item.product_id).with_for_update()
            )
            product = product_result.scalar_one_or_none()
            if product:
                product.quantity_in_stock += item.quantity

        order.status = OrderStatus.CANCELLED
        await db.commit()

        await db.refresh(order, ["items"])
        result = await db.execute(
            select(Order)
            .options(selectinload(Order.items).selectinload(OrderItem.product), selectinload(Order.customer))
            .where(Order.id == order.id)
        )
        return _order_to_response(result.scalar_one())
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel order: {str(e)}",
        )

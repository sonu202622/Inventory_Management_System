from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import Product, Customer, Order

router = APIRouter(prefix="/dashboard", tags=["Dashboard"], dependencies=[Depends(get_current_user)])


@router.get("/stats")
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    try:
        total_products = (await db.execute(select(func.count(Product.id)))).scalar() or 0
        total_customers = (await db.execute(select(func.count(Customer.id)))).scalar() or 0
        total_orders = (await db.execute(select(func.count(Order.id)))).scalar() or 0

        low_stock_result = await db.execute(
            select(Product)
            .where(Product.quantity_in_stock < 10)
            .order_by(Product.quantity_in_stock)
        )
        low_stock_products = low_stock_result.scalars().all()

        return {
            "total_products": total_products,
            "total_customers": total_customers,
            "total_orders": total_orders,
            "low_stock_count": len(low_stock_products),
            "low_stock_products": [
                {
                    "id": p.id,
                    "name": p.name,
                    "sku": p.sku,
                    "quantity_in_stock": p.quantity_in_stock,
                }
                for p in low_stock_products
            ],
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch dashboard stats: {str(e)}",
        )

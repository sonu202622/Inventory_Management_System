from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import Product
from app.schemas import ProductCreate, ProductUpdate, ProductResponse

router = APIRouter(prefix="/products", tags=["Products"], dependencies=[Depends(get_current_user)])


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(data: ProductCreate, db: AsyncSession = Depends(get_db)):
    try:
        existing = await db.execute(select(Product).where(Product.sku == data.sku))
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product with SKU '{data.sku}' already exists",
            )
        product = Product(**data.model_dump())
        db.add(product)
        await db.commit()
        await db.refresh(product)
        return product
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create product: {str(e)}",
        )


@router.get("/", response_model=List[ProductResponse])
async def list_products(
    low_stock: Optional[bool] = Query(None), db: AsyncSession = Depends(get_db)
):
    try:
        stmt = select(Product).order_by(Product.created_at.desc())
        if low_stock:
            stmt = stmt.where(Product.quantity_in_stock < 10)
        result = await db.execute(stmt)
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch products: {str(e)}",
        )


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str, db: AsyncSession = Depends(get_db)):
    try:
        product = await db.get(Product, product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
            )
        return product
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch product: {str(e)}",
        )


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str, data: ProductUpdate, db: AsyncSession = Depends(get_db)
):
    try:
        product = await db.get(Product, product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
            )

        if data.sku is not None and data.sku != product.sku:
            existing = await db.execute(
                select(Product).where(Product.sku == data.sku)
            )
            if existing.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product with SKU '{data.sku}' already exists",
                )

        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(product, key, value)
        await db.commit()
        await db.refresh(product)
        return product
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update product: {str(e)}",
        )


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(product_id: str, db: AsyncSession = Depends(get_db)):
    try:
        product = await db.get(Product, product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
            )
        await db.delete(product)
        await db.commit()
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete product: {str(e)}",
        )

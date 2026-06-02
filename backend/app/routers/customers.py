from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import Customer
from app.schemas import CustomerCreate, CustomerResponse

router = APIRouter(prefix="/customers", tags=["Customers"], dependencies=[Depends(get_current_user)])


@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(data: CustomerCreate, db: AsyncSession = Depends(get_db)):
    try:
        existing = await db.execute(select(Customer).where(Customer.email == data.email))
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Customer with email '{data.email}' already exists",
            )
        customer = Customer(**data.model_dump())
        db.add(customer)
        await db.commit()
        await db.refresh(customer)
        return customer
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create customer: {str(e)}",
        )


@router.get("/", response_model=List[CustomerResponse])
async def list_customers(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Customer).order_by(Customer.created_at.desc()))
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch customers: {str(e)}",
        )


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: str, db: AsyncSession = Depends(get_db)):
    try:
        customer = await db.get(Customer, customer_id)
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found"
            )
        return customer
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch customer: {str(e)}",
        )


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(customer_id: str, db: AsyncSession = Depends(get_db)):
    try:
        customer = await db.get(Customer, customer_id)
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found"
            )
        await db.delete(customer)
        await db.commit()
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete customer: {str(e)}",
        )

from pydantic import BaseModel, Field


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    type: str  # income / expense
    icon: str | None = None
    color: str | None = None
    parent_id: int | None = None


class CategoryUpdate(BaseModel):
    name: str | None = None
    icon: str | None = None
    color: str | None = None


class CategoryResponse(BaseModel):
    id: int
    name: str
    type: str | None
    icon: str | None
    color: str | None
    parent_id: int | None

    model_config = {"from_attributes": True}

from pydantic import BaseModel


class DictionaryCreate(BaseModel):
    name: str


class DictionaryResponse(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}

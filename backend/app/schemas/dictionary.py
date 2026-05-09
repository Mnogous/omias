from pydantic import BaseModel


class DictionaryCreate(BaseModel):
    name: str


class DictionaryResponse(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class FondCreate(BaseModel):
    name: str
    code: str


class FondResponse(BaseModel):
    id: int
    name: str
    code: str

    model_config = {"from_attributes": True}

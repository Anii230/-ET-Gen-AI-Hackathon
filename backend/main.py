from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import engine, Base
from routers import feed, articles, chat, attention
from routers import users
from agents.briefing_router import router as briefing_router
from routers.story_arc import router as story_arc_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(title="ET AI News API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(feed.router, prefix="/feed", tags=["feed"])
app.include_router(articles.router, prefix="/articles", tags=["articles"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(attention.router, prefix="/attention", tags=["attention"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(briefing_router, prefix="/briefing", tags=["briefing"])
app.include_router(story_arc_router, prefix="/story-arcs", tags=["story-arcs"])

@app.get("/health")
def health():
    return {"status": "ok"}

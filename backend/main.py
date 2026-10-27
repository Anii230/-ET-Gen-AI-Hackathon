import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import cors_origins
from database import engine, Base
from llm import LLMServiceError
from routers import feed, articles, chat, attention
from routers import users
from agents.briefing_router import router as briefing_router
from routers.story_arc import router as story_arc_router

logger = logging.getLogger("et_news.app")


class UnhandledErrorMiddleware:
    """Return JSON (with CORS headers) instead of a bare 500.

    Starlette's built-in 500 response is produced outside the CORS
    middleware, so the browser sees it as a network/CORS failure. This
    middleware sits inside CORS and converts unexpected errors into a
    proper JSON body, letting CORSMiddleware add the headers.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        started = False

        async def send_wrapper(message):
            nonlocal started
            if message["type"] == "http.response.start":
                started = True
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception:
            logger.exception(
                "Unhandled error on %s %s",
                scope.get("method"),
                scope.get("path"),
            )
            if not started:
                response = JSONResponse(
                    status_code=500,
                    content={"detail": "Internal server error."},
                )
                await response(scope, receive, send)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="ET AI News API", lifespan=lifespan)

# Added first so CORSMiddleware wraps it and can add headers to its responses.
app.add_middleware(UnhandledErrorMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(LLMServiceError)
async def llm_service_error_handler(request: Request, exc: LLMServiceError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.user_message, "code": exc.code},
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

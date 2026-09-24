import os

# Set required environment variables for test execution
os.environ["APP_SECRET"] = "super_secret_test_key_at_least_32_characters_long"
os.environ["BOT_TOKEN"] = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
os.environ["DATABASE_URL"] = "postgresql+asyncpg://giftguard:giftguard@localhost:5432/giftguard"
os.environ["REDIS_URL"] = "redis://localhost:6379/0"

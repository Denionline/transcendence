# **************************************************************************** #
#                                    Path's                                    #
# **************************************************************************** #

DATABASE_PATH			= srcs/database
FRONTEND_PATH			= srcs/frontend
BACKEND_PATH			= srcs/backend

# **************************************************************************** #
#                                    Files                                     #
# **************************************************************************** #

COMPOSE_FILE			= srcs/docker-compose.yml

# **************************************************************************** #
#                                 Environment                                  #
# **************************************************************************** #

ifeq ($(wildcard .env),)
$(error .env not found)
endif

include .env

POSTGRES_HOST_PORT		?= 5432

DBURL					= postgresql://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@localhost:$(POSTGRES_HOST_PORT)/$(POSTGRES_DB)?schema=public

# **************************************************************************** #
#                                   Rules                                      #
# **************************************************************************** #

MAKE					= make --no-print-directory
RM						= rm -rf

# **************************************************************************** #
#                                    Comands                                   #
# **************************************************************************** #

.PHONY: all build up down clean fclean re lint format logs ps status test ci report rebuild oblivion dbaccess dbstats seed

all: up

build:
	docker compose --env-file .env -f $(COMPOSE_FILE) build

up: srcs/backend/node_modules/.package-lock.json srcs/frontend/node_modules/.package-lock.json
	docker compose --env-file .env -f $(COMPOSE_FILE) up --build -d

down:
	docker compose --env-file .env -f $(COMPOSE_FILE) down

clean:
	docker compose --env-file .env -f $(COMPOSE_FILE) down
	docker compose --env-file .env -f $(COMPOSE_FILE) rm -f

fclean:
	docker compose --env-file .env -f $(COMPOSE_FILE) down -v
	docker compose --env-file .env -f $(COMPOSE_FILE) rm -f

re: down up

lint:
	npm run lint --prefix srcs/frontend
	npm run lint --prefix srcs/backend

format:
	npx prettier --write "srcs/**/*.{ts,tsx,js,json,css}"


# Commands to check docker
logs:
	docker compose --env-file .env -f $(COMPOSE_FILE) logs -f

ps:
	docker compose --env-file .env -f $(COMPOSE_FILE) ps

status:
	docker compose --env-file .env -f $(COMPOSE_FILE) ps --status running

# Development
srcs/backend/node_modules/.package-lock.json: srcs/backend/package.json srcs/backend/package-lock.json
	npm ci --prefix srcs/backend && touch $@

srcs/backend/package-lock.json: srcs/backend/package.json
	npm install --prefix srcs/backend

srcs/frontend/node_modules/.package-lock.json: srcs/frontend/package.json srcs/frontend/package-lock.json
	npm ci --prefix srcs/frontend && touch $@

srcs/frontend/package-lock.json: srcs/frontend/package.json
	npm install --prefix srcs/frontend

# test: up
# 	@echo "INFO    access OAuth with: http://localhost:9000/api/auth/42"
# 	@echo "INFO    access db with 'make dbaccess'"

ci:
	@echo "TEST    Lint (frontend + backend)"
	npm run lint --prefix $(FRONTEND_PATH)
	npm run lint --prefix $(BACKEND_PATH)
	@echo "TEST    Frontend build"
	npm run build --prefix $(FRONTEND_PATH)
	@echo "TEST    Backend typecheck (prisma generate + tsc)"
	cd $(BACKEND_PATH) && npx prisma generate && npx tsc --noEmit
	@echo "TEST    Start test database (wait for healthy)"
	docker compose --env-file .env -f $(COMPOSE_FILE) up -d --wait database
	@echo "TEST    Apply migrations"
	@cd $(BACKEND_PATH) && DATABASE_URL="$(DBURL)" npx prisma migrate deploy
	@echo "TEST    Backend tests"
	npm test --prefix $(BACKEND_PATH)
	@echo "TEST    CI looking good"

report:
	@\
	echo "    Containers:" ; docker ps -a ; \
	echo "    Images:" ; docker image ls ; \
	echo "    Volumes:" ; docker volume ls ; \
	echo "    Networks:" ; docker network ls

rebuild: fclean up

oblivion:
	@echo "\n\n    WARNING: This will delete ALL containers, images and volumes for THIS project!"
	@echo "    Press Ctrl+C within 5 seconds to cancel..."
	@sleep 5
	docker compose --env-file .env -f $(COMPOSE_FILE) down -v --rmi all
	$(RM) srcs/backend/node_modules srcs/frontend/node_modules
	$(RM) --verbose package-lock.json srcs/frontend/package-lock.json srcs/backend/package-lock.json
	$(RM) --verbose srcs/backend/generated/prisma

# See docs/db_seeding.md
seed: srcs/backend/node_modules/.package-lock.json
	@echo "SEED    Apply migrations"
	@cd $(BACKEND_PATH) && DATABASE_URL="$(DBURL)" npx prisma migrate deploy
	@echo "SEED    Populate demo data"
	npm run seed --prefix $(BACKEND_PATH)

dbstats:
	@docker exec transcendence-db psql -U $(POSTGRES_USER) -d $(POSTGRES_DB) -c "SELECT (SELECT count(*) FROM \"Gig\") gigs, (SELECT count(*) FROM \"Swipe\") swipes, (SELECT count(*) FROM \"Match\") matches, (SELECT count(*) FROM \"ChatMessage\") chats, (SELECT count(*) FROM \"User\") users, (SELECT count(*) FROM \"Category\") categories, (SELECT count(*) FROM \"User\" WHERE role = 'artist') artists, (SELECT count(*) FROM \"User\" WHERE role = 'hirer') hirers, (SELECT count(*) FROM \"User\" WHERE role = 'admin') admins;"

dbaccess:
	@echo "INFO    type '\\q' to quit"
	docker exec -it transcendence-db psql -U $(POSTGRES_USER) -d $(POSTGRES_DB)

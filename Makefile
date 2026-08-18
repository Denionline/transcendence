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
COMPOSE					= docker compose --env-file .env -f $(COMPOSE_FILE)

# **************************************************************************** #
#                                    Comands                                   #
# **************************************************************************** #

.PHONY: all build up down clean fclean re lint format logs ps status ci report rebuild oblivion dbaccess dbstats seed help

all: up

build:
	$(COMPOSE) build

up: srcs/backend/node_modules/.package-lock.json srcs/frontend/node_modules/.package-lock.json
	$(COMPOSE) up --build -d

down:
	$(COMPOSE) down

clean:
	$(COMPOSE) down

fclean: clean
	$(COMPOSE) down -v

re: down up

lint:
	npm run lint --prefix $(FRONTEND_PATH)
	npm run lint --prefix $(BACKEND_PATH)

format:
	npx prettier --write "srcs/**/*.{ts,tsx,js,json,css}"


# Commands to check docker
logs:
	$(COMPOSE) logs -f

ps:
	$(COMPOSE) ps

status:
	$(COMPOSE) ps --status running

# Development
srcs/backend/node_modules/.package-lock.json: srcs/backend/package.json srcs/backend/package-lock.json
	npm ci --prefix srcs/backend && touch $@

srcs/backend/package-lock.json: srcs/backend/package.json
	npm install --prefix srcs/backend

srcs/frontend/node_modules/.package-lock.json: srcs/frontend/package.json srcs/frontend/package-lock.json
	npm ci --prefix srcs/frontend && touch $@

srcs/frontend/package-lock.json: srcs/frontend/package.json
	npm install --prefix srcs/frontend

ci:
	@echo "TEST    Lint (frontend + backend)"
	$(MAKE) lint
	@echo "TEST    Frontend build"
	npm run build --prefix $(FRONTEND_PATH)
	@echo "TEST    Backend typecheck (prisma generate + tsc)"
	cd $(BACKEND_PATH) && npx prisma generate && npx tsc --noEmit
	@echo "TEST    Start test database (wait for healthy)"
	$(COMPOSE) up -d --wait database
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
	$(COMPOSE) down -v --rmi all
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
	@$(COMPOSE) exec -T database psql -U $(POSTGRES_USER) -d $(POSTGRES_DB) -c "SELECT (SELECT count(*) FROM \"Gig\") gigs, (SELECT count(*) FROM \"Swipe\") swipes, (SELECT count(*) FROM \"Match\") matches, (SELECT count(*) FROM \"ChatMessage\") chats, (SELECT count(*) FROM \"User\") users, (SELECT count(*) FROM \"Category\") categories, (SELECT count(*) FROM \"User\" WHERE role = 'artist') artists, (SELECT count(*) FROM \"User\" WHERE role = 'hirer') hirers, (SELECT count(*) FROM \"User\" WHERE role = 'admin') admins;"

dbaccess:
	@echo "INFO    type '\\q' to quit"
	$(COMPOSE) exec database psql -U $(POSTGRES_USER) -d $(POSTGRES_DB)

help:
	@echo "Stack:"
	@echo "  all/up      start the stack in the background"
	@echo "  build       build the images"
	@echo "  down        stop the stack"
	@echo "  re          restart (down + up)"
	@echo "  rebuild     start fresh, dropping volumes (fclean + up)"
	@echo ""
	@echo "Cleanup:"
	@echo "  clean       remove the containers"
	@echo "  fclean      remove the containers and their volumes"
	@echo "  oblivion    remove this project's containers, images, volumes and node_modules"
	@echo ""
	@echo "Code:"
	@echo "  lint        lint frontend and backend"
	@echo "  format      run prettier over srcs"
	@echo "  ci          lint, build, typecheck, migrate and test"
	@echo ""
	@echo "Inspect:"
	@echo "  logs        follow the container logs"
	@echo "  ps          list this project's containers"
	@echo "  status      list only the running containers"
	@echo "  report      list all docker containers, images, volumes and networks"
	@echo ""
	@echo "Database:"
	@echo "  seed        apply migrations and load demo data"
	@echo "  dbstats     print row counts per table"
	@echo "  dbaccess    open a psql shell"

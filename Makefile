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
#                                   Rules                                      #
# **************************************************************************** #

MAKE							= make --no-print-directory
RM								= rm -rf

# **************************************************************************** #
#                                    Comands                                   #
# **************************************************************************** #

.PHONY: all build up down clean fclean re lint format logs ps status test oblivion dbaccess

all: up

# build:
# 	docker compose --env-file .env -f $(COMPOSE_FILE) build

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
	cd srcs/frontend && npm run lint && cd -
	cd srcs/backend && npm run lint && cd -

format:
	npx prettier --write "src/**/*.{ts,tsx,js,json,css}"


# Commands to check docker
logs:
	docker compose --env-file .env -f $(COMPOSE_FILE) logs -f

ps:
	docker compose --env-file .env -f $(COMPOSE_FILE) ps

status:
	docker compose --env-file .env -f $(COMPOSE_FILE) ps --status running

# Development
srcs/backend/node_modules/.package-lock.json: srcs/backend/package.json srcs/backend/package-lock.json
	cd srcs/backend && npm ci ; cd - touch $@

srcs/backend/package-lock.json:
	cd srcs/backend; npm install; cd -

srcs/frontend/node_modules/.package-lock.json: srcs/frontend/package.json srcs/frontend/package-lock.json
	cd srcs/frontend && npm ci ; cd - touch $@

srcs/frontend/package-lock.json:
	cd srcs/frontend; npm install; cd -

test: up
	curl -s http://localhost:9000
	@echo "INFO also check curl -s http://localhost:3000"
	@echo "INFO access db with 'make dbaccess'"

report:
	@\
	echo "    Containers:" ; docker ps -a ; \
	echo "    Images:" ; docker image ls ; \
	echo "    Volumes:" ; docker volume ls ; \
	echo "    Networks:" ; docker network ls

rebuild: fclean build up

oblivion: fclean
	@echo "WARNING: This will delete ALL Docker data on this system!"
	@echo "Press Ctrl+C within 5 seconds to cancel..."
	@sleep 5
	docker system prune --all --volumes --force

dbaccess:
	@echo "INFO type '\\q' to quit"
	docker exec -it transcendence-db psql -U abess -d maria_teresa

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

# .PHONY: all build up down clean fclean re

# all: build up

# build: $(DATABASE_PATH) $(FRONTEND_PATH)
# 	docker compose -f $(COMPOSE_FILE) build

# up:
# 	docker compose -f $(COMPOSE_FILE) up -d

# down:
# 	docker compose -f $(COMPOSE_FILE) down

# clean:
# 	docker compose -f $(COMPOSE_FILE) down
# 	docker system prune -af

# re: clean all

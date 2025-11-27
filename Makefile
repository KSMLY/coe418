build:
	docker compose build 

up: build
	docker compose up -d

down:
	docker compose down

clean: down
	docker compose rm -f

fclean: clean
	docker compose prune -f --volumes

re: clean up

hard-re: fclean up

.PHONY: build up down clean fclean re hard-re
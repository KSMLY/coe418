FROM mariadb:10.11

COPY conf/mariadb.cnf /etc/mysql/mariadb.conf.d/50-server.conf
COPY conf/init.sql /docker-entrypoint-initdb.d/

EXPOSE 3306


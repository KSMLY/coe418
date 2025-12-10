FROM mariadb:latest

# Copy initialization script from conf directory
COPY conf/init.sql /docker-entrypoint-initdb.d/

# Set correct permissions
RUN chmod 644 /docker-entrypoint-initdb.d/init.sql
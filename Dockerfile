FROM --platform=amd64 cimg/node:20.9.0
USER root
WORKDIR /app
COPY . .

RUN rm -rf node_modules .angular && \
    npm cache clean --force && \
    npm install --verbose && \
    npm install -g @angular/cli@17.3.8 && \
    bash build-dev.sh

#docker build -t test --no-cache --progress=plain -f Dockerfile .

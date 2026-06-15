# Download PocketBase binary (cached until PB_VERSION changes)
FROM alpine:3.21 AS builder
ARG PB_VERSION=0.39.4
RUN apk add --no-cache curl unzip ca-certificates \
    && curl -L -o /tmp/pb.zip \
        "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" \
    && unzip /tmp/pb.zip -d /pb/ \
    && rm /tmp/pb.zip

FROM alpine:3.21
RUN addgroup -g 1001 -S pbgroup && adduser -S pbuser -u 1001 -G pbgroup
WORKDIR /pb

RUN apk add --no-cache ca-certificates wget su-exec \
    && mkdir -p pb_data pb_migrations pb_hooks \
    && chown -R pbuser:pbgroup /pb

COPY --from=builder --chown=pbuser:pbgroup /pb/pocketbase ./pocketbase
COPY --chown=pbuser:pbgroup ./pb_migrations ./pb_migrations
COPY --chown=pbuser:pbgroup ./pb_hooks ./pb_hooks

EXPOSE 8090
HEALTHCHECK --interval=15s --timeout=10s --start-period=30s --retries=5 \
  CMD wget -q -O- http://localhost:8090/api/health || exit 1

# Start as root to fix volume ownership, then drop to pbuser via su-exec
CMD ["sh", "-c", "chown -R pbuser:pbgroup /pb/pb_data && exec su-exec pbuser sh -c './pocketbase serve --http=0.0.0.0:8090 --origins=$ORIGINS --encryptionEnv=POCKETBASE_ENCRYPTION_KEY'"]

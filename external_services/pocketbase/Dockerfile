# syntax=docker/dockerfile:1

# =============================================================================
# SiteWise PocketBase backend — standard production image
# =============================================================================
# Multi-stage, multi-arch build that bundles the SiteWise server-side hooks on
# top of a pinned PocketBase release.
#
# Build (single arch):
#   docker build -t sitewise-backend external_services/pocketbase
#
# Build a specific PocketBase version:
#   docker build --build-arg PB_VERSION=0.39.4 -t sitewise-backend external_services/pocketbase
#
# Run:
#   docker run -d --name sitewise-backend \
#     -p 8090:8090 \
#     -v sitewise_pb_data:/pb/pb_data \
#     -e TURNSTILE_SECRET_KEY=your-secret \
#     sitewise-backend
# =============================================================================

# Pin the PocketBase release. SiteWise hooks use the modern JSVM API
# (onRecord*Success / e.app / e.next) and therefore require PocketBase >= 0.23.
ARG PB_VERSION=0.39.4
ARG ALPINE_VERSION=3.20

# -----------------------------------------------------------------------------
# Stage 1: download + verify the PocketBase binary for the target platform
# -----------------------------------------------------------------------------
FROM alpine:${ALPINE_VERSION} AS downloader

ARG PB_VERSION
# Provided automatically by BuildKit (e.g. linux/amd64, linux/arm64).
ARG TARGETOS
ARG TARGETARCH
ARG TARGETVARIANT

RUN apk add --no-cache ca-certificates unzip wget

WORKDIR /download

# Map Docker's TARGETARCH to the naming used by PocketBase release assets.
RUN set -eux; \
    case "${TARGETARCH}${TARGETVARIANT}" in \
      "amd64")  PB_ARCH="amd64"  ;; \
      "arm64")  PB_ARCH="arm64"  ;; \
      "armv7")  PB_ARCH="armv7"  ;; \
      *) echo "Unsupported architecture: ${TARGETARCH}${TARGETVARIANT}" >&2; exit 1 ;; \
    esac; \
    PB_ZIP="pocketbase_${PB_VERSION}_${TARGETOS:-linux}_${PB_ARCH}.zip"; \
    echo "Downloading ${PB_ZIP}"; \
    wget -q "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/${PB_ZIP}" -O pocketbase.zip; \
    unzip pocketbase.zip pocketbase -d /download; \
    chmod +x /download/pocketbase; \
    /download/pocketbase --version

# -----------------------------------------------------------------------------
# Stage 2: minimal runtime image
# -----------------------------------------------------------------------------
FROM alpine:${ALPINE_VERSION} AS production

ARG PB_VERSION

# wget (busybox) is used by the HEALTHCHECK; ca-certificates/tzdata for TLS &
# correct timezones in logs and scheduled jobs.
RUN apk add --no-cache ca-certificates tzdata wget && \
    addgroup -g 1001 -S pocketbase && \
    adduser -S -u 1001 -G pocketbase pocketbase

WORKDIR /pb

COPY --from=downloader /download/pocketbase /usr/local/bin/pocketbase

# Bundle the SiteWise server-side hooks and the entrypoint.
COPY pb_hooks/ /pb/pb_hooks/
COPY entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh && \
    mkdir -p /pb/pb_data /pb/pb_migrations /pb/pb_public && \
    chown -R pocketbase:pocketbase /pb

LABEL org.opencontainers.image.title="SiteWise Backend (PocketBase)" \
      org.opencontainers.image.description="PocketBase backend for SiteWise, bundled with server-side hooks" \
      org.opencontainers.image.vendor="SiteWise" \
      org.opencontainers.image.source="https://github.com/site-wise/app" \
      org.opencontainers.image.licenses="O'Saasy" \
      io.sitewise.pocketbase.version="${PB_VERSION}"

USER pocketbase

# Persistent data (SQLite DB, uploaded files, settings) lives here.
VOLUME ["/pb/pb_data"]

ENV PB_HTTP=0.0.0.0:8090 \
    PB_DATA_DIR=/pb/pb_data \
    PB_HOOKS_DIR=/pb/pb_hooks \
    PB_MIGRATIONS_DIR=/pb/pb_migrations \
    PB_PUBLIC_DIR=/pb/pb_public

EXPOSE 8090

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8090/api/health || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

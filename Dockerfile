FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules

# copy required resources
COPY src src
COPY test test
COPY .oxfmtrc.json .oxfmtrc.json
COPY .oxlintrc.json .oxlintrc.json
COPY package.json package.json
COPY tsconfig.json tsconfig.json
COPY package.json package.json
COPY bunfig.toml bunfig.toml
COPY test-setup.ts test-setup.ts

# tests & build
ENV NODE_ENV=production
RUN bun run build
RUN bun test

# build final image
FROM base AS release

RUN DEBIAN_FRONTEND=noninteractive apt update && apt install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /usr/src/app/build/action .

COPY LICENSE README.md /

COPY scripts /usr/src/scripts
RUN chmod +x /usr/src/scripts/create-pr

COPY "entrypoint.sh" "/entrypoint.sh"
RUN chmod +x /entrypoint.sh

# User to run the app
USER bun

ENTRYPOINT ["/entrypoint.sh"]
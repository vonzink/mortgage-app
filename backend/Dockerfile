# syntax=docker/dockerfile:1.7

# ─── Build stage ───────────────────────────────────────────────────────────
# Eclipse Temurin 25 (matches the host JDK the project is built against today).
# Maven is layered on top so the build is reproducible regardless of host tooling.
FROM eclipse-temurin:25-jdk-alpine AS build

WORKDIR /workspace

# Maven wrapper / pom first so dependency resolution is cached across rebuilds —
# only re-runs when pom.xml actually changes, not on every code edit.
COPY pom.xml mvnw .mvn/ ./
RUN apk add --no-cache maven \
 && mvn -B -q -e -DskipTests dependency:go-offline

COPY src ./src
RUN mvn -B -q -e -DskipTests package \
 && cp target/*.jar /workspace/app.jar

# ─── Runtime stage ────────────────────────────────────────────────────────
# JRE-only alpine image (~80MB base + ~70MB app = ~150MB final).
FROM eclipse-temurin:25-jre-alpine AS runtime

# curl for healthcheck; tini for proper signal handling on container stop.
RUN apk add --no-cache curl tini \
 && addgroup -S app && adduser -S app -G app

WORKDIR /app
COPY --from=build /workspace/app.jar /app/app.jar
RUN chown -R app:app /app
USER app

EXPOSE 8081

# Tells Spring + JVM to respect cgroup limits and use up to 75% of container RAM.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:+UseG1GC -Djava.security.egd=file:/dev/./urandom"
ENV SPRING_PROFILES_ACTIVE=prod

# /api/health is whitelisted in SecurityConfig so it doesn't need a token.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8081/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]

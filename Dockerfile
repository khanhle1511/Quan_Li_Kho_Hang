# ---------- Bước 1: build file .jar bằng Maven ----------
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

# ---------- Bước 2: image chạy, chỉ chứa JRE + file .jar ----------
FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /app/target/qlkho-web-1.0.0.jar app.jar
# Gói free của Render có 512 MB RAM: giới hạn bộ nhớ JVM cho an toàn
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -Xss512k -XX:TieredStopAtLevel=1"
ENV SPRING_PROFILES_ACTIVE=prod
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]

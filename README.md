# ASTRO

## Basic Astronomy Tools

Repository of basic astronomy tools built while working under a [CNPQ](http://www.cnpq.br)'s [PCI Scholarship](http://www.cnpq.br/web/guest/view/-/journal_content/56_INSTANCE_0oED/10157/25094) for [Brazil's National Observatory](http://www.on.br).

## Dependencies

- JDK 1.8
- Docker (for development container)
- VS Code with Remote - Containers extension (optional)
- Maven (or use the Maven Wrapper)

## Development

### Running the Development Container

#### Using VS Code

1. Ensure you have the **Remote - Containers** extension installed.
2. Open this project folder in VS Code.
3. Press `F1` and select **Remote-Containers: Open Folder in Container**.
4. VS Code will build and launch the development container defined in `.devcontainer/`.

#### Using the Dev Containers CLI

```bash
# Install the Dev Containers CLI (if not already installed)
npm install -g @devcontainers/cli

# From the project root
devcontainer up
```

### Running in Development Mode

The application starts a random available port on `localhost` and pops up a Swing GUI window indicating the URL.



```bash
# Start via Maven Wrapper
./mvnw spring-boot:run

# Or with local Maven
mvn spring-boot:run
```

After startup the GUI will display something like:

```
ASTRO

IP: http://localhost:<random-port>
```

![](imgs/doc1.png?raw=true)

Click **Abrir** or navigate manually to the printed URL to access the app.

## Building the WAR File

To produce the deployable `.war` artifact:

```bash
# Clean and package the application
mvn clean package
```

The WAR will be generated at `target/ASTRO-1.0-RC.war`.

## Deployment

### Deploying to Production

> **Note:** `daed` is the hostname of the production server.

Copy the WAR to the production server and deploy under Tomcat:

```bash
# From your local machine (replace <your-user> with your SSH username)
scp target/ASTRO-1.0-RC.war <your-user>@daed:/tmp/ASTRO.war

# SSH into the production server
ssh <your-user>@daed

# Move the WAR into Tomcat's webapps directory
cp /tmp/ASTRO.war /opt/tomcat/webapps/ASTRO.war

# (Optional) Restart Tomcat if auto-deploy is disabled
# sudo systemctl restart tomcat
```

## Examples

Library examples (using [Three.js](http://www.threejs.org)) are available on the tools' main site.

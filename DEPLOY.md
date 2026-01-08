# Set Game - Fly.io Deployment

## Prerequisites

1. Install Fly CLI: https://fly.io/docs/hands-on/install-flyctl/
2. Login to Fly.io: `fly auth login`

## Deploy

### First-time setup

```bash
# From the project root (d:\set game)
fly launch --no-deploy
```

This will:
- Create your app on Fly.io
- You can customize the app name when prompted
- Skip the database (not needed for this game)

### Deploy the app

```bash
fly deploy
```

### View your app

```bash
fly open
```

### View logs

```bash
fly logs
```

## Configuration

The app is configured to:
- Run on a shared CPU with 256MB RAM
- Auto-stop when idle (saves costs)
- Auto-start when requests come in
- Use HTTPS

## Scaling

To keep the app always running (better for real-time games):

```bash
fly scale count 1 --max-per-region=1
```

To update fly.toml to prevent auto-stopping, set:
```toml
auto_stop_machines = "off"
min_machines_running = 1
```

## Costs

With auto-stop enabled, you'll only be charged when the app is running.
Fly.io has a generous free tier that should cover light usage.

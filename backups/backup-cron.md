# Inator Backup Schedule

Automated rotating backups run via cron and save to `backups/system-backup-<timestamp>/`.
The schedule below is the default. Edit the cron expression to change frequency, then re-install.

## Current Schedule

Every 12 hours — midnight and noon.

## Crontab Entry

```
0 0,12 * * * /absolute/path/to/inator/scripts/backup.sh >> /absolute/path/to/inator/logs/backup.log 2>&1
```

Replace `/absolute/path/to/inator` with the actual path on your server, e.g.:
```
0 0,12 * * * /home/user/inator/scripts/backup.sh >> /home/user/inator/logs/backup.log 2>&1
```

## Installing / Updating

```bash
crontab -e
# Add or update the line above, save, and exit.
```

To verify the cron job is registered:
```bash
crontab -l
```

## Common Schedules

| Expression        | Meaning                  |
|-------------------|--------------------------|
| `0 0,12 * * *`    | Every 12 hours (default) |
| `0 0,6,12,18 * * *` | Every 6 hours          |
| `0 0 * * *`       | Once daily at midnight   |
| `0 * * * *`       | Every hour               |

## Notes

- Rotating backups keep a maximum of **28** snapshots (auto-pruned).
- For permanent manual snapshots that are never pruned, use: `task backup:baseline`
- Baseline snapshots are stored in `backups/baseline/` and must be deleted manually.

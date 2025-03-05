# Production Deployment Guide

This guide covers best practices for deploying the Nostr Commerce Framework in a production environment.

## System Requirements

### Recommended Hardware
- **CPU**: 2+ cores
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 100GB+ SSD
- **Network**: High-bandwidth, low-latency connection
- **Architecture**: x86_64 / amd64

### Software Requirements
- **Operating System**: Ubuntu 20.04 LTS or later
- **Node.js**: v18.x LTS
- **Bitcoin Core**: v24.0 or later
- **Lightning Implementation**: LND v0.15.0+ / CLN v22.11+

## Security Configuration

### System Security
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install security updates automatically
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Configure firewall
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

### SSL/TLS Setup
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com
```

### Application Security
```typescript
// Configure security options
const framework = new NostrCommerce({
  security: {
    rateLimit: {
      window: 60000,  // 1 minute
      max: 100        // requests
    },
    encryption: {
      algorithm: 'aes-256-gcm'
    },
    authentication: {
      required: true,
      mfa: true
    }
  }
});
```

## Monitoring Setup

### Application Monitoring
```typescript
// Configure monitoring
framework.configure({
  monitoring: {
    metrics: {
      enabled: true,
      port: 9090,
      path: '/metrics'
    },
    logging: {
      level: 'info',
      format: 'json',
      destination: '/var/log/nostr-commerce.log'
    }
  }
});
```

### Key Metrics to Monitor
1. **Transaction Metrics**
   - Success rate
   - Volume
   - Average amount
   - Processing time

2. **System Metrics**
   - CPU usage
   - Memory consumption
   - Disk I/O
   - Network latency

3. **Application Metrics**
   - Request rate
   - Error rate
   - Response time
   - Active connections

### Logging Configuration
```typescript
// Structured logging setup
const logger = framework.logger.configure({
  level: 'info',
  format: 'json',
  fields: {
    service: 'nostr-commerce',
    environment: 'production'
  },
  destinations: [
    {
      type: 'file',
      path: '/var/log/nostr-commerce.log',
      rotation: {
        size: '100m',
        keep: 5
      }
    },
    {
      type: 'stdout'
    }
  ]
});
```

## Scaling Strategy

### Horizontal Scaling
1. **Load Balancing**
   ```nginx
   upstream nostr_commerce {
     server 127.0.0.1:3000;
     server 127.0.0.1:3001;
     server 127.0.0.1:3002;
   }
   ```

2. **Database Sharding**
   ```typescript
   const framework = new NostrCommerce({
     database: {
       sharding: {
         enabled: true,
         shards: 4,
         strategy: 'consistent-hashing'
       }
     }
   });
   ```

3. **Caching**
   ```typescript
   const framework = new NostrCommerce({
     cache: {
       enabled: true,
       provider: 'redis',
       url: 'redis://localhost:6379',
       ttl: 3600
     }
   });
   ```

### Performance Optimization
1. **Connection Pooling**
   ```typescript
   framework.configure({
     pool: {
       min: 5,
       max: 20,
       idleTimeoutMillis: 30000
     }
   });
   ```

2. **Rate Limiting**
   ```typescript
   framework.configure({
     rateLimit: {
       window: 60000,
       max: 100,
       strategy: 'sliding-window'
     }
   });
   ```

## Backup Strategy

### Data Backup
```bash
#!/bin/bash
# Backup script for Nostr Commerce Framework

# Backup configuration
backup_dir="/var/backups/nostr-commerce"
date_format=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$backup_dir"

# Backup database
pg_dump nostr_commerce > "$backup_dir/db_$date_format.sql"

# Backup configuration
cp /etc/nostr-commerce/* "$backup_dir/config_$date_format/"

# Compress backup
tar -czf "$backup_dir/backup_$date_format.tar.gz" "$backup_dir/db_$date_format.sql" "$backup_dir/config_$date_format"

# Clean old backups (keep last 7 days)
find "$backup_dir" -type f -mtime +7 -delete
```

## Deployment Checklist

### Pre-deployment
- [ ] Review security configurations
- [ ] Test backup/restore procedures
- [ ] Update documentation
- [ ] Verify monitoring setup
- [ ] Check SSL certificates
- [ ] Review rate limits

### Deployment
- [ ] Create deployment package
- [ ] Backup current system
- [ ] Deploy new version
- [ ] Run database migrations
- [ ] Verify system health
- [ ] Monitor error rates

### Post-deployment
- [ ] Verify monitoring
- [ ] Check backup system
- [ ] Review logs
- [ ] Test critical paths
- [ ] Update status page

## Troubleshooting

### Common Issues

1. **Connection Issues**
   ```typescript
   // Check relay connectivity
   framework.checkRelayStatus().then(status => {
     console.log('Relay status:', status);
   });
   ```

2. **Performance Problems**
   ```typescript
   // Enable debug logging
   framework.setLogLevel('debug');
   
   // Monitor performance metrics
   framework.metrics.watch(['cpu', 'memory', 'requests']);
   ```

3. **Payment Verification Delays**
   ```typescript
   // Check Lightning Network status
   framework.lightning.checkNodeStatus().then(status => {
     console.log('Lightning node status:', status);
   });
   ```

### Emergency Procedures

1. **System Recovery**
   ```bash
   # Restore from backup
   ./restore.sh latest
   
   # Verify system integrity
   ./health-check.sh
   ```

2. **Emergency Contacts**
   - System Administrator: admin@yourdomain.com
   - Security Team: security@yourdomain.com
   - Bitcoin Node Operator: bitcoin@yourdomain.com

## Maintenance

### Regular Tasks
1. Log rotation
2. Database optimization
3. SSL certificate renewal
4. Security updates
5. Backup verification

### Update Procedure
```bash
#!/bin/bash
# Update script

# Stop service
systemctl stop nostr-commerce

# Backup
./backup.sh

# Update packages
npm update

# Run migrations
npm run migrate

# Start service
systemctl start nostr-commerce

# Verify health
./health-check.sh
```
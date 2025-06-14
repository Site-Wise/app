# Security Policy

## Supported Versions

We actively support the following versions of SiteWise with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of SiteWise seriously. If you discover a security vulnerability, please help us protect our users by following responsible disclosure practices.

### How to Report

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please report security vulnerabilities by:

1. **Email**: Send details to [security@sitewise.in] (replace with your actual security email)
2. **Subject Line**: Use "SECURITY: [Brief Description]"
3. **Include**: 
   - Detailed description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact assessment
   - Any suggested fixes (if available)

### What to Include

Please provide as much information as possible:

- **Vulnerability Type**: (e.g., SQL injection, XSS, authentication bypass)
- **Affected Components**: Which parts of the application are affected
- **Attack Vector**: How the vulnerability can be exploited
- **Impact**: What an attacker could achieve
- **Reproduction Steps**: Detailed steps to reproduce the issue
- **Environment**: Browser, OS, PocketBase version, etc.
- **Proof of Concept**: Screenshots, code snippets, or demo (if safe to share)

### Response Timeline

We are committed to addressing security issues promptly:

- **Initial Response**: Within 24 hours of receiving your report
- **Vulnerability Assessment**: Within 72 hours
- **Status Updates**: Every 7 days until resolution
- **Resolution Target**: Critical issues within 7 days, others within 30 days

### Security Update Process

1. **Acknowledgment**: We confirm receipt and validate the vulnerability
2. **Investigation**: Our team investigates and assesses the impact
3. **Fix Development**: We develop and test a security patch
4. **Disclosure**: We coordinate disclosure with the reporter
5. **Release**: Security update is released with advisory
6. **Credit**: Reporter receives credit (if desired) in release notes

## Security Best Practices

### For Contributors

When contributing to SiteWise, please follow these security guidelines:

#### Code Security
- **Input Validation**: Always validate and sanitize user inputs
- **SQL Injection**: Use parameterized queries and ORM features
- **XSS Prevention**: Escape output and use Vue.js built-in protections
- **Authentication**: Never bypass authentication checks
- **Authorization**: Implement proper role-based access controls
- **Secrets Management**: Never commit API keys, passwords, or tokens

#### Dependencies
- **Keep Updated**: Regularly update dependencies to latest secure versions
- **Vulnerability Scanning**: Use `npm audit` to check for known vulnerabilities
- **Minimal Dependencies**: Only include necessary dependencies
- **License Compliance**: Ensure dependencies have compatible licenses

#### PocketBase Security
- **API Rules**: Implement proper collection access rules
- **Data Validation**: Validate data on both client and server sides
- **File Uploads**: Secure file upload handling with type validation
- **Rate Limiting**: Implement rate limiting for API endpoints

### For Users

#### Self-Hosting Security
If you're self-hosting SiteWise:

- **HTTPS**: Always use HTTPS in production
- **Database Security**: Secure your PocketBase database file
- **Access Controls**: Implement proper network access controls
- **Backups**: Regular backups with encryption
- **Updates**: Keep SiteWise and PocketBase updated
- **Monitoring**: Monitor for suspicious activity

#### Account Security
- **Strong Passwords**: Use strong, unique passwords
- **Access Reviews**: Regularly review user access and permissions
- **Session Management**: Log out from shared devices
- **Data Privacy**: Be mindful of sensitive data in photos and notes

## Known Security Considerations

### Current Security Measures

- **Authentication**: JWT-based authentication via PocketBase
- **Authorization**: Role-based access control (Owner, Supervisor, Accountant)
- **Data Isolation**: Site-based data segregation
- **Input Validation**: Client-side and server-side validation
- **File Security**: Secure file upload handling
- **CORS**: Proper CORS configuration

### Areas of Focus

- **File Upload Security**: Validation of uploaded photos and documents
- **Data Export**: Secure handling of exported data
- **Session Management**: Proper session timeout and invalidation
- **API Rate Limiting**: Protection against abuse
- **Error Handling**: Secure error messages without information disclosure

## Vulnerability Disclosure Policy

### Scope

This security policy covers:
- The main SiteWise application (frontend)
- PocketBase integration and configuration
- Documentation and setup guides
- Deployment recommendations

### Out of Scope

- Third-party dependencies (report to respective maintainers)
- PocketBase core vulnerabilities (report to PocketBase team)
- Issues in user-deployed instances due to misconfiguration
- Social engineering attacks

### Safe Harbor

We support security researchers and will not pursue legal action against researchers who:

- Make good faith efforts to avoid privacy violations and data destruction
- Only interact with accounts you own or with explicit permission
- Do not perform attacks that could harm the reliability/integrity of services
- Do not access or modify data that doesn't belong to you
- Contact us before publicly disclosing any vulnerabilities
- Give us reasonable time to address issues before disclosure

## Security Resources

### For Developers

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Vue.js Security Best Practices](https://vuejs.org/guide/best-practices/security.html)
- [PocketBase Security Documentation](https://pocketbase.io/docs/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

### Security Tools

We recommend using these tools during development:

- **npm audit**: Check for dependency vulnerabilities
- **ESLint Security Plugin**: Static analysis for security issues
- **OWASP ZAP**: Web application security testing
- **Snyk**: Vulnerability scanning for dependencies
- **SonarQube**: Code quality and security analysis

## Contact Information

For security-related inquiries:

- **Security Email**: [security@sitewise.in]
- **Response Time**: Within 24 hours
- **PGP Key**: [Link to PGP key if available]

For general questions about this security policy:
- **GitHub Issues**: For clarification on security practices
- **Documentation**: Refer to our security documentation

## Security Acknowledgments

We would like to thank the following individuals for responsibly disclosing security vulnerabilities:

<!-- This section will be updated as security researchers contribute -->

*No security issues have been reported yet.*

---

**Last Updated**: [Current Date]
**Version**: 1.0

This security policy is subject to change. Please check this document regularly for updates.
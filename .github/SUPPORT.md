# Getting Support for SiteWise

Thank you for using SiteWise! We're here to help you get the most out of our construction site management application.

## 📚 Self-Help Resources

Before reaching out for support, please check these resources:

### Documentation
- **[User Guide](../USER_GUIDE.md)** - Complete guide for end users
- **[Technical Documentation](../DOCUMENTATION.md)** - Technical details and architecture
- **[README](../README.md)** - Project overview and quick start
- **[Contributing Guidelines](../CONTRIBUTING.md)** - How to contribute to the project

### Common Issues
- **[FAQ Section](#frequently-asked-questions)** - Answers to common questions
- **[Troubleshooting Guide](#troubleshooting)** - Solutions to common problems
- **[Known Issues](https://github.com/site-wise/app/issues?q=is%3Aissue+is%3Aopen+label%3Aknown-issue)** - Current known issues and workarounds

## 💬 Community Support

### GitHub Discussions
For general questions, feature discussions, and community support:
- **[Q&A Discussions](https://github.com/site-wise/app/discussions/categories/q-a)** - Ask questions and get help from the community
- **[General Discussions](https://github.com/site-wise/app/discussions/categories/general)** - General discussions about SiteWise
- **[Feature Requests](https://github.com/site-wise/app/discussions/categories/ideas)** - Propose and discuss new features

### GitHub Issues
For specific bugs or technical issues:
- **[Bug Reports](https://github.com/site-wise/app/issues/new?template=bug_report.yml)** - Report bugs or unexpected behavior
- **[Feature Requests](https://github.com/site-wise/app/issues/new?template=feature_request.yml)** - Request new features
- **[Questions](https://github.com/site-wise/app/issues/new?template=question.yml)** - Technical questions and help

## 🚨 Critical Issues

### Security Vulnerabilities
For security-related issues, please follow our responsible disclosure process:
- **Email**: security@sitewise.in
- **See**: [Security Policy](../SECURITY.md) for detailed guidelines

### Production Outages
If you're experiencing a production outage or critical system failure:
1. Check [GitHub Issues](https://github.com/site-wise/app/issues) for known outages
2. Email: support@sitewise.in with "CRITICAL" in the subject line
3. Include your environment details and error messages

## 📧 Direct Support

### Email Support
- **General Support**: support@sitewise.in
- **Security Issues**: security@sitewise.in
- **Partnership/Business**: hello@sitewise.in

### Response Times
We aim to respond within:
- **Critical Issues**: 4 hours
- **Bug Reports**: 1-2 business days
- **Feature Requests**: 3-5 business days
- **General Questions**: 2-3 business days

*Note: Response times may vary during weekends and holidays.*

## 🔧 Before Contacting Support

To help us assist you more effectively, please:

### Gather Information
- **SiteWise Version**: Check in Settings or About section
- **Browser**: Name and version (e.g., Chrome 91.0.4472.124)
- **Operating System**: e.g., Windows 10, macOS 12.1, Ubuntu 20.04
- **Device Type**: Desktop, mobile, tablet
- **Error Messages**: Exact error text or screenshots
- **Console Logs**: Check browser developer tools (F12)

### Try Basic Troubleshooting
- Clear browser cache and cookies
- Try in an incognito/private window
- Test with a different browser
- Check network connectivity
- Verify PocketBase server status (if self-hosting)

### Search Existing Issues
- Check [open issues](https://github.com/site-wise/app/issues)
- Search [closed issues](https://github.com/site-wise/app/issues?q=is%3Aissue+is%3Aclosed)
- Browse [discussions](https://github.com/site-wise/app/discussions)

## ❓ Frequently Asked Questions

### Installation and Setup

**Q: How do I install SiteWise?**
A: See our [Installation Guide](../README.md#installation--setup) for detailed setup instructions.

**Q: What are the system requirements?**
A: 
- Node.js 18 or higher
- Modern web browser (Chrome, Firefox, Safari, Edge)
- PocketBase server for backend

**Q: Can I use SiteWise offline?**
A: Yes, SiteWise has PWA capabilities for basic offline functionality. Some features require internet connectivity.

### Usage and Features

**Q: How do I invite team members to my site?**
A: Go to User Management → Invite User, enter their email and select a role. See [User Management](../USER_GUIDE.md#user-management) for details.

**Q: What's the difference between user roles?**
A: 
- **Owner**: Full access, can manage users and billing
- **Supervisor**: Can create/edit data but can't delete or manage users
- **Accountant**: Read-only access with full financial report access

**Q: How do I upgrade my subscription?**
A: Go to Subscription in your profile menu and select a new plan. See [Subscription Management](../USER_GUIDE.md#subscription-management).

### Technical Issues

**Q: Why can't I see my data?**
A: Check that you're on the correct site. Use the site selector in the top navigation to switch between sites.

**Q: Photos aren't uploading. What should I do?**
A: 
- Check file size (max 10MB)
- Ensure stable internet connection
- Try JPG or PNG format
- Clear browser cache

**Q: The application is running slowly. How can I improve performance?**
A: 
- Close unnecessary browser tabs
- Clear browser cache
- Check internet connection speed
- Try a different browser

### Self-Hosting

**Q: Can I host SiteWise on my own servers?**
A: Yes, SiteWise is open source. See [Deployment](../DOCUMENTATION.md#deployment) for hosting instructions.

**Q: How do I backup my data?**
A: For self-hosted instances, backup your PocketBase database file regularly. See PocketBase documentation for backup procedures.

## 🛠️ Troubleshooting

### Common Problems and Solutions

#### Authentication Issues
- **Can't log in**: Check credentials, clear browser cache, try incognito mode
- **Session expired**: Log out and log back in
- **Password reset not working**: Check spam folder, try different email

#### Data Issues
- **Data not loading**: Check internet connection, refresh page, verify correct site selected
- **Changes not saving**: Check form validation errors, ensure proper permissions
- **Missing data**: Verify you're on the correct site and have proper access

#### Performance Issues
- **Slow loading**: Clear cache, check internet speed, try different browser
- **Application freezing**: Close other tabs, restart browser, check system resources
- **Mobile issues**: Update browser, check device storage space

#### Installation Issues
- **npm install fails**: Check Node.js version, clear npm cache, try npm ci
- **Build errors**: Check TypeScript errors, update dependencies
- **PocketBase connection**: Verify server URL, check network connectivity

### Error Messages

#### "Permission denied"
- Verify your user role has the required permissions
- Contact site owner to adjust your role if needed

#### "Network error"
- Check internet connectivity
- Verify PocketBase server is running (if self-hosting)
- Try refreshing the page

#### "Site not found"
- Check if you have access to the site
- Contact the site owner for access
- Verify the site URL is correct

## 📱 Mobile Support

### Progressive Web App (PWA)
- **Installation**: Use "Add to Home Screen" in your mobile browser
- **Offline Mode**: Basic functionality available without internet
- **Sync**: Data syncs when connection restored

### Mobile Issues
- **Touch not working**: Update browser, check device compatibility
- **Layout problems**: Report screen size and device type
- **Camera not working**: Check browser permissions for camera access

## 🌍 Internationalization

### Language Support
- English (default)
- Hindi
- Additional languages: Submit requests through GitHub issues

### Translation Issues
- Missing translations: Report in GitHub issues
- Incorrect translations: Submit corrections through pull requests

## 🤝 Community Guidelines

When seeking support in our community:

1. **Be Respectful**: Follow our [Code of Conduct](../CODE_OF_CONDUCT.md)
2. **Be Clear**: Provide detailed information about your issue
3. **Be Patient**: Allow time for community responses
4. **Be Helpful**: Share solutions that work for you
5. **Search First**: Check if your question has been answered before

## 📈 Feature Requests and Feedback

We love hearing from our users! Here's how to share feedback:

### Feature Requests
- Use [Feature Request template](https://github.com/site-wise/app/issues/new?template=feature_request.yml)
- Describe the problem you're solving
- Explain your proposed solution
- Include use cases and mockups if available

### General Feedback
- Use [GitHub Discussions](https://github.com/site-wise/app/discussions)
- Email: feedback@sitewise.in
- Include specific examples and suggestions

## 📊 Reporting Bugs

When reporting bugs, please include:

1. **Steps to reproduce** the issue
2. **Expected behavior** vs actual behavior
3. **Environment details** (browser, OS, version)
4. **Screenshots** or screen recordings
5. **Console errors** from browser developer tools
6. **Workarounds** you've tried

Use our [Bug Report template](https://github.com/site-wise/app/issues/new?template=bug_report.yml) for the best results.

---

Thank you for being part of the SiteWise community! Your feedback and participation help make SiteWise better for everyone. 🏗️✨
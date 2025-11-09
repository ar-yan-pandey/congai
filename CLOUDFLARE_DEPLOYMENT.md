# Cloudflare Pages Deployment Guide

## 🚀 Quick Setup

### Step 1: Connect Your Repository

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** → **Create Application** → **Pages**
3. Click **Connect to Git**
4. Select your repository: `ar-yan-pandey/congai`
5. Click **Begin Setup**

---

## ⚙️ Build Configuration

### **Framework Preset**
```
Next.js
```

### **Production Branch**
```
main
```

### **Root Directory (Important!)**
```
frontend
```
⚠️ **CRITICAL**: Your Next.js app is in the `frontend` folder, not root!

### **Build Command**
```
npm run build
```

### **Build Output Directory**
```
.next
```

### **Node Version**
```
18.17.0
```
(Specified in `.node-version` file)

---

## 🔐 Environment Variables

Add these in Cloudflare Pages settings:

### **Required**
```
GEMINI_API_KEY = your_gemini_api_key_here
```

### **Optional**
```
NEXT_PUBLIC_API_URL = your_backend_url_here
```
(Leave empty if backend not deployed yet)

---

## 📝 Exact Settings to Use

When configuring your Cloudflare Pages project, use these **exact values**:

| Setting | Value |
|---------|-------|
| **Framework preset** | `Next.js` |
| **Build command** | `npm run build` |
| **Build output directory** | `.next` |
| **Root directory** | `frontend` |
| **Node.js version** | `18` (auto-detected from `.node-version`) |

---

## 🔧 Advanced Settings (Optional)

### **Compatibility Flags**
```
nodejs_compat
```

### **Build Cache**
```
Enabled (default)
```

### **Preview Deployments**
```
Enabled (recommended)
```

---

## 🐛 Common Issues & Fixes

### Issue 1: "Module not found" errors
**Solution**: Already fixed! All imports now use relative paths instead of `@/lib/utils`

### Issue 2: Build timeout
**Solution**: Cloudflare Pages has 20-minute timeout, should be plenty. If it fails:
- Check build logs
- Ensure `package-lock.json` is committed
- Try clearing build cache in settings

### Issue 3: 3D Avatar not loading
**Solution**: Make sure `public/models/test4.glb` is committed to Git

### Issue 4: Environment variables not working
**Solution**: 
- Add `GEMINI_API_KEY` in Cloudflare Pages settings
- Redeploy after adding variables
- Use `NEXT_PUBLIC_` prefix for client-side variables

---

## 📦 Files to Commit

Make sure these are in your Git repository:

```bash
frontend/
├── .node-version          # ✅ Created
├── package.json           # ✅ Exists
├── package-lock.json      # ✅ Exists
├── next.config.js         # ✅ Updated
├── jsconfig.json          # ✅ Updated
├── pages/                 # ✅ All fixed
├── components/            # ✅ All fixed
├── lib/utils.js           # ✅ Exists
└── public/models/         # ✅ Check GLB file is here
```

---

## 🚀 Deployment Steps

### 1. **Commit All Changes**
```bash
cd c:/Users/aryan/Desktop/Aryan/conai
git add .
git commit -m "Configure for Cloudflare Pages deployment"
git push origin main
```

### 2. **Create Cloudflare Pages Project**
- Go to Cloudflare Dashboard
- Workers & Pages → Create → Pages → Connect to Git
- Select repository
- Configure build settings (see above)

### 3. **Add Environment Variables**
- Go to project settings
- Environment Variables
- Add `GEMINI_API_KEY`
- Save

### 4. **Deploy**
- Click "Save and Deploy"
- Wait for build (usually 2-5 minutes)
- Get your URL: `your-project.pages.dev`

---

## ✅ Build Success Checklist

After deployment, verify:

- [ ] Homepage loads (`/`)
- [ ] Map displays correctly
- [ ] AI Assistant appears at bottom
- [ ] Voice chat works
- [ ] Routes page loads (`/routes`)
- [ ] Insights page loads (`/insights`)
- [ ] 3D avatar animates
- [ ] No console errors

---

## 🔄 Automatic Deployments

Once set up, Cloudflare Pages will:
- ✅ Auto-deploy on every push to `main`
- ✅ Create preview deployments for PRs
- ✅ Show build logs and errors
- ✅ Provide unique URLs for each deployment

---

## 🌐 Custom Domain (Optional)

To use your own domain:

1. Go to project → Custom Domains
2. Click "Set up a custom domain"
3. Enter your domain (e.g., `congestionai.com`)
4. Follow DNS configuration steps
5. Wait for SSL certificate (automatic)

---

## 📊 Performance on Cloudflare

Expected metrics:
- **Global CDN**: Content served from 275+ locations
- **First Load**: < 2 seconds
- **Subsequent Loads**: < 500ms (cached)
- **Uptime**: 99.99%
- **Free SSL**: Automatic HTTPS

---

## 🆘 Troubleshooting

### Build Fails with "Module not found"
```bash
# Make sure all imports are relative or use correct aliases
# Already fixed in your codebase!
```

### Build Succeeds but Site is Blank
- Check browser console for errors
- Verify environment variables are set
- Check if `.next` folder is being generated

### 3D Model Not Loading
- Verify `public/models/test4.glb` exists
- Check file size (should be < 10MB for fast loading)
- Test model URL: `https://your-site.pages.dev/models/test4.glb`

### API Calls Failing
- Add `NEXT_PUBLIC_API_URL` environment variable
- Or update backend URL in code
- Check CORS settings on backend

---

## 📞 Support

- **Cloudflare Docs**: https://developers.cloudflare.com/pages/
- **Next.js on Cloudflare**: https://developers.cloudflare.com/pages/framework-guides/nextjs/
- **Community**: https://community.cloudflare.com/

---

## 🎉 You're Ready!

Your configuration is complete. Just:
1. Commit the `.node-version` file
2. Push to GitHub
3. Connect to Cloudflare Pages
4. Deploy!

**Estimated deployment time**: 3-5 minutes ⚡

---

**Last Updated**: November 9, 2024  
**Platform**: Cloudflare Pages  
**Framework**: Next.js 15.0.3

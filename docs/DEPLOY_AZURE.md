# Deploy to Azure (portal / GUI)

One **Azure App Service** (Linux, Node 22) runs both apps. A GitHub Actions workflow builds the repo and uploads the result every time you push to `main`. Your database stays on MongoDB Atlas.

```
GitHub (main) ──Actions: build + prune──► zip ──► Azure App Service  https://<name>.azurewebsites.net
                                                   ├─ Next.js on $PORT (public)
                                                   └─ Express on 127.0.0.1:4000 (private)  ──► MongoDB Atlas
```
`scripts/start.mjs` is what App Service runs: it starts both processes and exits if either dies.

> The portal changes its layout from time to time. If a label below differs slightly, look for the closest match.

## 0. Before you start
- A GitHub repo with this code on the `main` branch.
- A MongoDB Atlas cluster and a database user. Keep the connection string:
  `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/resaleanything`
- An Azure subscription (Azure for Students gives $100 credit). A **B1** plan costs roughly $13/month, so the credit lasts several months. Check the pricing calculator.

## 1. Create the Web App
1. Open <https://portal.azure.com>. In the top search box type **App Services** and open it, then **Create → Web App**.
2. **Basics** tab:
   - **Subscription:** Azure for Students
   - **Resource Group:** *Create new* → `resaleanything-rg`
   - **Name:** something globally unique, e.g. `resaleanything-yourname`. This becomes `https://<name>.azurewebsites.net`.
   - **Publish:** Code
   - **Runtime stack:** Node 22 LTS
   - **Operating System:** Linux
   - **Region:** pick one close to your users (e.g. Central India). Student subscriptions restrict some regions; if creation fails with a policy/quota error, choose another region from the list.
   - **Pricing plan:** *Create new*, then under *Explore pricing plans* choose **Basic B1**.
     (Free F1 exists but has no *Always on*, a small daily CPU quota and shared CPU. It is not suitable for running two servers.)
3. **Deployment** tab: leave *Continuous deployment* **Disabled** (our own workflow handles it).
4. **Networking** / **Monitoring:** defaults are fine (you can enable Application Insights later).
5. **Review + create → Create**, then **Go to resource**.

## 2. Configure the app
All of these are on the Web App's left menu.

**a) Environment variables** (*Settings → Environment variables → App settings → + Add*). Add each, then **Apply** and confirm the restart:

| Name | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | your Atlas connection string (with the `/resaleanything` database name) |
| `APP_ORIGIN` | `https://<name>.azurewebsites.net` (later: your custom domain) |
| `DATA_DIR` | `/home/data` (persistent storage for photo uploads) |
| `TRUST_PROXY` | `2` (Azure's front end + Next.js sit in front of the API) |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `false` (the workflow ships a finished build) |

**b) General settings** (*Settings → Configuration → General settings*):
- **Startup Command:** `node scripts/start.mjs`
- **Always on:** On
- **HTTPS Only:** On (on newer portals this is under *Settings → TLS/SSL settings*)
- **SCM Basic Auth Publishing Credentials:** On. This is required to download the publish profile in step 3. (If it is greyed out, check *Settings → Configuration → General settings* for *Basic authentication*.)
- **Save**.

## 3. Get the publish profile
On the Web App's **Overview** page click **Get publish profile** (top toolbar). A `.PublishSettings` file downloads. Open it in a text editor and copy **all** of its contents. Treat it like a password.

## 4. Give GitHub access
In your GitHub repo: **Settings → Secrets and variables → Actions**.
1. **Secrets** tab → **New repository secret** → name `AZURE_WEBAPP_PUBLISH_PROFILE`, value = the file contents you copied.
2. **Variables** tab → **New repository variable** → name `AZURE_WEBAPP_NAME`, value = your web app name (just the name, not the URL).

## 5. Deploy
1. In GitHub open the **Actions** tab → **Deploy to Azure App Service** → **Run workflow** (branch `main`). It also runs automatically on every push to `main` once the variable exists.
2. Wait for the run to turn green (a few minutes: install, build, upload). The first start on Azure can take another minute or two.
3. Open `https://<name>.azurewebsites.net`.

## 6. Allow Azure to reach Atlas
Atlas blocks unknown IPs. In Atlas go to **Network Access → Add IP Address**:
- Safest on the free M0 tier: add the app's outbound IPs. In the portal, Web App **Overview → JSON View**, or *Networking → Outbound addresses*, then copy each address from `possibleOutboundIpAddresses` (there are several, and they can change if you scale or change plan).
- Simplest: **Allow access from anywhere** (`0.0.0.0/0`). Acceptable with a strong database password; M0 has no private networking.

Do this before step 5 if you can; otherwise the app starts but cannot reach the database, and the log shows a connection timeout.

## 7. Check it works
- `https://<name>.azurewebsites.net/api/health` should show `{"ok":true}`.
- Web App **Monitoring → Log stream** should contain `Connected to MongoDB` and `API listening`. (If the stream is empty, enable *Monitoring → App Service logs → Application logging: File System* first.)
- In the browser: register, post an ad with a photo, then chat from a second account.

## Troubleshooting
| Symptom | Likely cause |
|---|---|
| Workflow shows "skipped" | the `AZURE_WEBAPP_NAME` **variable** is missing (variables and secrets are separate tabs) |
| Deploy step fails with 401/403 | *SCM Basic Auth Publishing Credentials* is off, or the publish profile secret is stale; download a new one |
| "Application Error" / 503 after deploy | check the Log stream. Usual causes: wrong startup command, `MONGODB_URI` missing, or Atlas blocking the IP |
| Logging in works but you are logged out on the next page | `APP_ORIGIN` does not exactly match the site URL (scheme and host), or HTTPS Only is off |
| Everyone hits "Too many attempts" together | `TRUST_PROXY` is not `2` |
| Uploaded photos vanish after a restart | `DATA_DIR` is not `/home/data` |

## Later improvements
- **Custom domain:** *Settings → Custom domains* → add it, then *Add binding* for a free App Service Managed Certificate. Update `APP_ORIGIN`.
- **Secrets:** keep `MONGODB_URI` in Key Vault and reference it from App settings.
- **Photos:** move uploads to Azure Blob Storage if you scale beyond one instance or want backups.
- **Cost control:** the plan bills while it exists, even if the app is stopped. Delete the `resaleanything-rg` resource group when you are done.

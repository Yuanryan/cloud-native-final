# GCP（GKE）部署 API — 具體步驟

> **注意**：`Job` 名稱為 `prisma-migrate`，若曾用本機 `infra/k8s/migrate-job.yaml` 在同一 namespace 建立過，請先執行  
> `kubectl delete job prisma-migrate -n safety-demo --ignore-not-found` 再套用本目錄的 Job。

以下假設你已安裝 **Google Cloud CLI**（`gcloud`）、`kubectl`、Docker，且 GCP 專案已**啟用計費**（GKE 需要）。

---

## 0. 安裝 `gcloud`（若出現 `command not found: gcloud`）

### macOS（Homebrew，建議）

```bash
brew install --cask gcloud-cli
```

安裝完成後，依 `brew` 結尾提示把 SDK 的 `bin` 加進 **PATH**（擇一或兩行都試，看檔案是否存在）：

```bash
# Apple Silicon 常見
export PATH="/opt/homebrew/share/google-cloud-sdk/bin:$PATH"
# Intel / 部分安裝路徑
export PATH="/usr/local/share/google-cloud-sdk/bin:$PATH"
```

可寫入 `~/.zshrc` 後 **重開終端機**，再執行：

```bash
gcloud version
```

### 官方安裝包

不打算用 Homebrew 時：[Install the Google Cloud CLI](https://cloud.google.com/sdk/docs/install-sdk) 依 macOS 圖形或指令安裝即可。

---

## 1. 登入並設定專案

```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
```

把 `YOUR_PROJECT_ID` 換成 Console 裡的專案 ID（不是顯示名稱）。

---

## 2. 啟用必要 API

```bash
gcloud services enable container.googleapis.com artifactregistry.googleapis.com
```

---

## 3. 建立 Artifact Registry（放 Docker 映像）

選一個區域，例如 `asia-east1`（台灣鄰近）：

```bash
export GCP_REGION=asia-east1
export AR_REPO=safety-api

gcloud artifacts repositories create "$AR_REPO" \
  --repository-format=docker \
  --location="$GCP_REGION" \
  --description="Employee safety API"
```

---

## 4. 建立 GKE 叢集（擇一）

### 選項 A：Autopilot（省事，由 Google 管節點）

```bash
gcloud container clusters create-auto safety-gke \
  --region="$GCP_REGION" \
  --release-channel=regular
```

### 選項 B：Standard 單節點（較好預估成本，適合作業）

```bash
export GCP_ZONE=asia-east1-a

gcloud container clusters create safety-gke \
  --zone="$GCP_ZONE" \
  --num-nodes=1 \
  --machine-type=e2-medium \
  --disk-size=30
```

---

## 5. 取得 kubectl 憑證

Autopilot：

```bash
gcloud container clusters get-credentials safety-gke --region="$GCP_REGION"
```

Standard（若用 `--zone`）：

```bash
gcloud container clusters get-credentials safety-gke --zone="$GCP_ZONE"
```

確認：

```bash
kubectl get nodes
```

---

## 6. 設定 Docker 推送到 Artifact Registry

```bash
gcloud auth configure-docker "${GCP_REGION}-docker.pkg.dev"
```

---

## 7. 建映像並推送

在 **repo 根目錄**（`final-project/`）執行：

```bash
export GCP_PROJECT="$(gcloud config get-value project)"
export IMAGE="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT}/${AR_REPO}/safety-api:v1"

docker build -f apps/api/Dockerfile -t "$IMAGE" .
docker push "$IMAGE"
```

之後改程式要再上線：把 `v1` 改成 `v2` 等，重新 build / push，再 `kubectl set image deployment/api api="$IMAGE" -n safety-demo` 或重新 apply 下面渲染過的 YAML。

---

## 8. K8s 資源：命名空間

在 **repo 根目錄**：

```bash
kubectl apply -f infra/k8s/namespace.yaml
```

---

## 9. 建立 Secret（勿 commit 真值）

把下列連線字串改成你的 **Supabase**（或實際 DB），`JWT_SECRET` 請用夠長的隨機字串：

```bash
kubectl create secret generic app-env -n safety-demo \
  --from-literal=DATABASE_URL='postgresql://...' \
  --from-literal=DIRECT_URL='postgresql://...' \
  --from-literal=JWT_SECRET='...' \
  --from-literal=JWT_EXPIRES_SEC='28800' \
  --from-literal=PORT='3000' \
  --from-literal=REDIS_URL='redis://...'
```

暫時沒有 Redis 可省略最後一行 `REDIS_URL`（與本機 README 明相同）。

---

## 10. 跑 Prisma migrate（一次性 Job）

在 **repo 根目錄**（確保已 `export IMAGE=...`）：

```bash
sed "s|__IMAGE__|$IMAGE|g" infra/k8s/gcp/migrate-job.yaml | kubectl apply -f -
kubectl wait --for=condition=complete job/prisma-migrate -n safety-demo --timeout=300s
kubectl logs job/prisma-migrate -n safety-demo --tail=50
```

失敗時常見原因：`DATABASE_URL` / `DIRECT_URL` 錯誤、或叢集出口無法連到 Supabase（較少見）。

若 Job 曾失敗過，需先刪除再重跑：

```bash
kubectl delete job prisma-migrate -n safety-demo --ignore-not-found
```

---

## 11. 部署 API + LoadBalancer

在 **repo 根目錄**：

```bash
sed "s|__IMAGE__|$IMAGE|g" infra/k8s/gcp/api-deployment.yaml | kubectl apply -f -
kubectl apply -f infra/k8s/gcp/api-service-loadbalancer.yaml
kubectl rollout status deployment/api -n safety-demo
```

取得對外 IP 或 hostname（約 1～3 分鐘；按 `Ctrl+C` 結束 watch）：

```bash
kubectl get svc api -n safety-demo -w
```

`EXTERNAL-IP` 有值後（有些區域會是 **hostname** 而非 IP，請以 Console 或 `kubectl get svc` 顯示為準），測試：

```bash
export LB_HOST="$(kubectl get svc api -n safety-demo -o jsonpath='{.status.loadBalancer.ingress[0].ip}')"
# 若 IP 為空，改用 hostname：
[ -z "$LB_HOST" ] && export LB_HOST="$(kubectl get svc api -n safety-demo -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"

curl -s "http://${LB_HOST}/health"
curl -s -X POST "http://${LB_HOST}/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"Password123!"}'
```

> Service 對外使用 **port 80 → Pod 3000**；若你改成 HTTPS Ingress，再另裝 Managed Cert 與 Ingress。

---

## 12. 更新或下線

- **更新映像**：build/push 新 tag → `kubectl set image deployment/api api=NEW_IMAGE -n safety-demo`
- **刪叢集（停止計費）**：
  - Autopilot：`gcloud container clusters delete safety-gke --region="$GCP_REGION"`
  - Standard：`gcloud container clusters delete safety-gke --zone="$GCP_ZONE"`

---

## 與本機 kind 的差異整理

| 項目 | kind | GCP |
|------|------|-----|
| 映像 | `kind load docker-image` | `docker push` 到 Artifact Registry |
| YAML | `infra/k8s/api-deployment.yaml`（local 映像） | 本目錄 `api-deployment.yaml`（`__IMAGE__` + `Always`） |
| 對外 | `kubectl port-forward` | `LoadBalancer` Service → 外部 IP |

更通用的說明仍見上一層 [`../README.md`](../README.md)。

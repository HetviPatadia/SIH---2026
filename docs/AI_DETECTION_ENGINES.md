# 🧠 Multi-Modal AI Detection Engines — Deep Dive

The **SIH26102 MPLADS AI Audit Intelligence System** uses 7 specialized detection engines to identify anomalies across public development works. Each engine evaluates independent operational indicators to construct a comprehensive risk profile.

---

## 📑 Table of Detection Engines

| # | Engine Name | Analytical Domain | Primary Methodology | Default Weight |
|---|---|---|---|---|
| **1** | Financial Outlier Engine | Cost & Budget | Z-Score, IQR & Isolation Forest | **20%** |
| **2** | Contractor Nexus Engine | Entity Graph | NetworkX Bipartite Centrality | **20%** |
| **3** | Spatial GIS Engine | Geospatial Footprint | Geodesic Haversine Proximity (<150m) | **15%** |
| **4** | Split-Tender Engine | Procurement Law | Threshold Proximity & Artificial Chunking | **15%** |
| **5** | Evidence Vision Engine | Visual Provenance | Perceptual Difference Hashing (dHash) | **15%** |
| **6** | NLP Text Similarity Engine | Scope of Work | TF-IDF & Cosine Lexical Similarity | **10%** |
| **7** | Temporal & Velocity Engine | Project Timeline | Expenditure Velocity & Start Latency | **5%** |

---

## 1. Financial Outlier Engine (`ai/financial`)

### Objective
Identify public works where sanctioned amounts or actual expenditures significantly deviate from peer works in the same sector (e.g. Community Halls, Rural Roads, Drinking Water) and district.

### Methodology
1. **Peer Group Stratification**: Works are clustered by `(Sector, District, Project_Category)`.
2. **Robust Statistical Z-Score**:
   $$Z_i = \frac{X_i - \mu_{\text{peer}}}{\sigma_{\text{peer}}}$$
   Where $X_i$ is the project unit cost, $\mu_{\text{peer}}$ is the median or mean peer cost, and $\sigma_{\text{peer}}$ is the standard deviation.
3. **Isolation Forest Machine Learning**:
   An unsupervised tree-based ensemble isolates anomalous instances in multi-dimensional space (sanction amount, expenditure ratio, contractor award count).
4. **Scoring Calibration**:
   - $Z \ge 3.0$ or Isolation Forest anomaly score $< -0.65$ maps to risk $\ge 85/100$.
   - Flagged reasons detail exact deviation percentages (e.g. *"+142% above district median for Drinking Water works"*).

---

## 2. Contractor Nexus & Network Engine (`ai/network` & `ai/contractor`)

### Objective
Uncover hidden syndicates, regional cartels, and multi-district contractor monopolies dominating project awards.

### Methodology
1. **Bipartite Network Graph**:
   Nodes consist of **Contractors** ($C$) and **Executing Agencies / Districts** ($A$). Edges represent awarded tenders weighted by total financial volume.
2. **Centrality Metrics**:
   - **Degree Centrality**: Proportion of total contracts held by an entity.
   - **Betweenness Centrality**:
     $$g(v) = \sum_{s \ne v \ne t} \frac{\sigma_{st}(v)}{\sigma_{st}}$$
     Identifies contractors acting as bridges between otherwise distinct administrative circles.
3. **Cartel Cluster Detection**:
   Using community detection (Louvain / Greedy Modularity) to detect sub-networks where a small cluster of contractors repeatedly split works within a single district.
4. **Monopoly Index**: Flags entities capturing $>40\%$ of all sector-specific works within a constituency.

---

## 3. Spatial GIS Engine (`ai/spatial`)

### Objective
Detect overlapping or ghost physical assets where multiple projects are recorded at virtually identical geographical coordinates.

### Methodology
1. **Haversine Geodesic Distance**:
   Calculates the surface distance between project coordinate pairs $(lat_1, lon_1)$ and $(lat_2, lon_2)$:
   $$d = 2r \arcsin \left( \sqrt{ \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right) } \right)$$
2. **Proximity Flagging**:
   - **Direct Conflict**: Projects sanctioned within $<150\text{ meters}$ of each other in the same sector within a 24-month window.
   - **Duplicate Asset Risk**: High probability that the same physical asset (e.g., tube well or road segment) was billed multiple times under different scheme allocations.

---

## 4. Split-Tendering Detection Engine (`ai/financial` & `ai/risk`)

### Objective
Detect deliberate project fragmentation ("tender splitting") designed to keep individual project values just below statutory thresholds requiring open e-tenders or higher administrative sanctions (e.g., ₹25 Lakh or ₹50 Lakh ceilings).

### Methodology
1. **Threshold Banding**: Defines statutory cutoff windows (e.g. ₹24,00,000 to ₹24,99,000 for a ₹25 Lakh threshold).
2. **Cluster Windowing**:
   Identifies sets of projects sharing:
   - Same Executing Agency / District
   - Same Contractor
   - Sanction dates within 60 days
   - Aggregated value exceeding the statutory tender ceiling
3. **Risk Scoring**: High probability scores when identical descriptions appear across 3+ chunked tenders awarded to the same contractor.

---

## 5. Evidence Vision & Perceptual Hash Engine (`ai/evidence`)

### Objective
Detect recycled or fraudulent site verification photographs submitted as proof of work completion.

### Methodology
1. **Perceptual Difference Hashing (`dHash`)**:
   - Grayscale conversion and resize to $9 \times 8$ pixels.
   - Computes relative gradients between adjacent pixels to generate a 64-bit fingerprint hash.
2. **Hamming Distance Comparison**:
   $$\text{Hamming Distance} = \sum (h_1 \oplus h_2)$$
   - $\text{Distance} \le 5$: Near-identical images, flagging evidence recycling across distinct project IDs.
3. **EXIF Metadata Auditing**:
   Extracts embedded GPS coordinates and creation timestamps from image EXIF metadata and compares them with the project's reported physical location and completion date.

---

## 6. NLP Lexical & Text Similarity Engine (`ai/nlp`)

### Objective
Identify redundant or recycled project work proposals where descriptions are essentially duplicated across projects to justify repetitive fund releases.

### Methodology
1. **Text Preprocessing**: Normalization, Indian administrative stop-word removal, and domain-specific tokenization.
2. **TF-IDF Vectorization**:
   $$w_{t,d} = \text{TF}(t, d) \times \log\left( \frac{N}{\text{DF}(t)} \right)$$
3. **Cosine Similarity Matrix**:
   $$\text{Cosine Sim}(u, v) = \frac{u \cdot v}{\|u\| \|v\|}$$
4. **Thresholding**: Pairs yielding Cosine Similarity $\ge 0.85$ within the same constituency trigger a lexical duplication alert.

---

## 7. Temporal & Velocity Engine (`ai/temporal`)

### Objective
Flag timeline anomalies including stalled physical starts, chronic completion delays, and abnormal expenditure velocity spikes (e.g. 95% of funds disbursed in the final week before financial year close).

### Methodology
1. **Start Latency**: Measures elapsed time between Administrative Sanction Date and Physical Work Commencement Date (flags $>180$ days).
2. **Completion Latency**: Compares expected completion target against actual recorded progress.
3. **Burn-Rate & Velocity Spikes**:
   Evaluates fund disbursement frequency to flag sudden, single-day disbursements lacking corresponding milestone progress reports.

---

## 🔀 Multi-Modal Fusion Engine (`ai/fusion`)

The **MultiModalFusionEngine** unifies signals across all 7 engines into a single, calibrated **Anomaly-Priority Score (0–100)**:

### Dynamic Weight Re-balancing
When certain modalities lack input data (e.g. a project lacks geotagged photos or GPS coordinates), the fusion engine automatically recalibrates weights among available engines so the total weight always equals $1.0$ ($100\%$):

```python
normalized_weight = base_weight / sum(available_weights)
final_score = sum(normalized_weight * domain_score for domain in available)
```

### Risk Category Boundaries
- **0 – 29**: 🟢 **LOW PRIORITY** (Routine monitoring)
- **30 – 59**: 🟡 **MEDIUM PRIORITY** (Standard desk audit)
- **60 – 79**: 🟠 **HIGH PRIORITY** (Prioritized physical verification)
- **80 – 100**: 🔴 **CRITICAL PRIORITY** (Immediate on-site inspection recommended)

---

## 🔍 Explainable AI (XAI) & SHAP Feature Attribution (`ai/explainability`)

Every score generated is paired with an explainability package:
1. **Radar/Decomposition Chart**: Visual breakdown showing exact percentage contribution of each domain to the total score.
2. **Factual Evidence Points**: Plain English explanations generated from factual anomalies (e.g., *"Haversine distance of 42 meters to Project #2024-8192 in the same sector"*).
3. **Counterfactual Context**: Informs officers of what standard peer performance looks like compared to the flagged project.

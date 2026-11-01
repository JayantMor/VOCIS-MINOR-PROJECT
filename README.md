# VOCIS — AI-Native Customer & Market Intelligence Platform

VOCIS is an AI-native platform that transforms raw customer feedback into structured, actionable business insights. Users can upload customer feedback in CSV/Excel format, after which VOCIS automatically processes the data, analyses sentiment and intent, discovers recurring themes, prioritises important issues, and generates AI-powered summaries and insights.

## Key Features

- **Automated Data Processing** — Detects and normalizes relevant feedback, rating, date, product, and brand fields.
- **Sentiment & Intent Analysis** — Identifies customer sentiment and classifies feedback into complaint, praise, request, question, or statement.
- **Theme Discovery** — Uses semantic embeddings and HDBSCAN clustering to identify recurring customer issues and themes.
- **Issue Prioritization** — Generates a 0–100 priority score using factors such as volume, negativity, severity, breadth, growth, and recency.
- **AI-Powered Insights** — Uses GPT-5.4 to generate theme names, issue narratives, executive summaries, and strategic insights from structured evidence.
- **Product & Competitive Analysis** — Compares products and brands when sufficient data is available.
- **Evidence Explorer** — Allows users to explore the customer feedback supporting the generated insights.
- **Interactive Dashboard** — Presents customer, issue, product, competitive, market, and strategic intelligence in one interface.

## How It Works

```text
CSV / Excel Feedback
        ↓
Data Processing & Schema Detection
        ↓
Sentiment + Intent + Severity
        ↓
Semantic Embeddings
        ↓
HDBSCAN Theme Discovery
        ↓
Priority Scoring
        ↓
GPT-5.4 Insight Generation
        ↓
Dashboard & Reports
```

## Tech Stack

**Frontend:** React  
**Backend:** FastAPI, Python  
**Database:** MongoDB  
**Data Processing:** Pandas  
**Sentiment:** VADER  
**Embeddings:** FastEmbed — BAAI/bge-small-en-v1.5  
**Clustering:** HDBSCAN  
**AI:** GPT-5.4  
**External Research:** Tavily

## Architecture

VOCIS separates deterministic analysis from AI interpretation. Python handles data processing, sentiment, embeddings, clustering, and priority calculations, while GPT-5.4 is used to interpret structured results and generate natural-language business insights.

## Project Objective

The goal of VOCIS is to demonstrate how **NLP, machine learning, semantic embeddings, clustering, and generative AI** can be combined to turn large amounts of unstructured customer feedback into meaningful intelligence for business decision-making.

## Limitations

The quality of insights depends on the quality and coverage of the uploaded dataset. Product, competitive, and temporal analyses are available only when the required data is present. Priority scores indicate analytical importance and do not prove causality or financial impact.

---

**VOCIS — From customer feedback to actionable intelligence.**

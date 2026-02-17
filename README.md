# Marketplace Backend (DDD)

This is a backend service that handles **user authentication** and a fairly complete **product editing workflow with multiple images**.

It’s built with **NestJS**, **PostgreSQL**, and structured using **Domain-Driven Design (DDD)**.

The project is split into two main parts:

* **Part 1 — Auth:** Register, login, JWT, password hashing, and roles (Merchant / Customer).
* **Part 2 — Products:** A single-operation edit flow where you can update fields, upload/delete/reorder images (minimum 1, maximum 5). Product ownership is enforced inside the domain.

---

## System Overview

Clients (Postman, any API client, or the Admin Dashboard in the browser) talk to the NestJS API.

The system is split into two main contexts:

* **Auth** → handles users, login, and JWT
* **Products** → handles product data and image management

The dashboard uses the same application layer as the API — it doesn’t duplicate business logic.

Data is stored in PostgreSQL, and uploaded images are saved locally in `uploads/`.

---

## How to Run

```bash
# 1. Start PostgreSQL
docker compose up -d

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env

# 4. Start the API
npm run start
```

API runs at:

```
http://localhost:3000
```

### Main Endpoints

* **Register**
  `POST /auth/register`
  `{ "email", "password", "role": "merchant" | "customer" }`

* **Login**
  `POST /auth/login`
  `{ "email", "password" }`
  → returns `accessToken` and `user`

* **Create product**
  `POST /products`
  Requires `Authorization: Bearer <token>`
  `multipart/form-data` (name, description, price, stock, files)

* **Edit product**
  `PUT /products/:id`
  Requires `Authorization: Bearer <token>`
  `multipart/form-data` (see below)

Images are served via:

```
GET /uploads/<filename>
```

---

# Admin Dashboard

There’s also a simple server-rendered dashboard (EJS) for product management.

* Merchant-only access
* JWT stored in an httpOnly cookie
* No SPA — just straightforward server-rendered pages

### Access

| URL                            | Description              |
| ------------------------------ | ------------------------ |
| `/dashboard/login`             | Login page               |
| `/dashboard`                   | Product list (protected) |
| `/dashboard/products/new`      | Create product           |
| `/dashboard/products/:id/edit` | Edit product             |
| `/dashboard/logout`            | Logout                   |

### Requirements

1. PostgreSQL must be running
2. You need a user with role **merchant**

### How It Works

1. Open `/dashboard/login`
2. Log in as a merchant: {
  "email": "m1@test.com",
  "password": "123456"
}
3. Create products (must upload 1–5 images)
4. Edit products:

   * Update fields
   * Drag to reorder images
   * Delete images
   * Replace images at the same index
   * Add new images
5. Logout when done

The dashboard calls the same use cases as the API. There’s no duplicated business logic in controllers.

---

# Architecture

The codebase is split into two bounded contexts:

| Context      | Responsibility                         |
| ------------ | -------------------------------------- |
| **auth**     | Users, registration, login, JWT, roles |
| **products** | Products, images, and editing logic    |

Each context follows the same layered structure:

* **Domain** → Entities, value objects, repository/storage interfaces
* **Application** → Use cases
* **Infrastructure** → Controllers, TypeORM, file storage, JWT, guards

The flow is always:

```
Controller → Use case → Domain
```

Dependencies point inward.
The domain layer does not know about NestJS, TypeORM, or the filesystem.

---

# Where the Rules Live

All product-related rules live inside the `Product` aggregate, specifically in `Product.edit()`.

These include:

* Only the owner can edit
* Product must always have at least 1 image
* Product cannot exceed 5 images
* Reorder must contain the exact same set of image IDs
* Replace targets must exist

Controllers don’t enforce these rules.
Use cases don’t duplicate them.

They simply call:

```
product.edit(...)
```

If something violates a rule, the domain throws an error.
The use case maps that error to an HTTP response.

That keeps the logic centralized and consistent.

---

# Single-Operation Product Edit

Editing a product is intentionally designed as one operation and one consistency boundary.

Here’s what happens:

1. The controller parses multipart form-data and extracts `actorId` from the JWT.
2. The use case loads the product from the repository.
3. New files are saved via `ImageStorage`.
4. `product.edit()`:

   * Applies field updates
   * Removes images
   * Replaces images at specific indexes
   * Appends new images
   * Reorders images
   * Validates that total images remain between 1 and 5
5. The use case determines which images were removed.
6. Removed images are deleted from storage.
7. The updated product is saved.
8. The updated product is returned.

Everything related to editing happens in a single flow.

---

# Auth Flow

**Register**

Client → Controller → RegisterUseCase → Repository → 201

**Login**

Client → Controller → LoginUseCase → bcrypt.compare → JwtService → 200 + JWT

---

# Design Decisions

Some intentional choices:

* Repository interfaces are defined in the **domain**
* Controllers are thin and only coordinate
* JWT contains the role to allow edge-level enforcement
* Ownership is validated inside the aggregate
* Removed images are deleted from both DB and disk during the same edit flow

No business rules in controllers.
No rule duplication across layers.

---

# Database Schema

**users**

* id (uuid PK)
* email (unique)
* password_hash
* role
* created_at
* updated_at

**products**

* id (uuid PK)
* merchant_id (FK → users)
* name
* description
* price
* stock
* created_at
* updated_at

**product_images**

* id (uuid PK)
* product_id (FK → products)
* url
* order_index

A user owns products.
A product owns its images.

---

# Project Structure (High Level)

```
src/
  auth/
  products/
  dashboard/
  app.module.ts
  main.ts

views/
public/
```

Each context contains its own domain, application, and infrastructure layers.

---

# Edit Product Request (Multipart)

`PUT /products/:id`

Headers:

```
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

Body fields:

| Key                 | Description                                                 |
| ------------------- | ----------------------------------------------------------- |
| `patch`             | JSON string (e.g. `{"name":"New name","price":200}`)        |
| `deleteImageIds`    | JSON array of image IDs to remove                           |
| `reorderToImageIds` | Full ordered list of image IDs                              |
| `replaceTargets`    | Image IDs to replace at the same index                      |
| `files`             | First N map to replaceTargets, remaining files are appended |

---

This project isn’t meant to be a full production marketplace.
It’s meant to demonstrate clean layering, aggregate-based rule enforcement, and a realistic edit workflow handled properly from end to end.



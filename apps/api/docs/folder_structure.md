# NestJS Module Folder Structure Standard

This document defines our standardized folder structure for NestJS modules. This structure promotes clean architecture, separation of concerns, and maintainability.

## Overview

Each module follows a consistent folder structure that separates different types of code into logical groups. This makes it easy for developers to understand where to find specific functionality and where to add new code.

## Standard Module Structure

```
src/
└── [module-name]/
    ├── [module-name].module.ts          # NestJS module definition
    ├── [module-name].controller.ts      # HTTP endpoints and request handling
    ├── [module-name].controller.spec.ts # Controller unit tests
    ├── [module-name].service.ts         # Business logic and orchestration
    ├── [module-name].service.spec.ts    # Service unit tests
    ├── [module-name].repository.ts      # Raw data access layer (optional)
    ├── dto/                             # Data Transfer Objects endpoints receive
    │   ├── index.ts                     # Barrel export for all DTOs
    │   ├── create-[entity].dto.ts       # Creation DTOs
    │   ├── update-[entity].dto.ts       # Update DTOs
    │   └── [specific-action].dto.ts     # Action-specific DTOs
    ├── interfaces/                      # Response types endpoints return
    │   ├── index.ts                     # Barrel export for all interfaces
    │   ├── [entity].interface.ts        # Main entity interfaces
    │   └── [response-type].interface.ts # API response interfaces
    ├── schemas/                         # Mongoose schemas (if using MongoDB)
    │   ├── [entity].schema.ts           # Main entity schema
    │   └── [sub-entity].schema.ts       # Related schemas
    ├── domain/                          # Pure functions and business logic
    │   ├── builders/                    # Object builders and factories
    │   │   ├── index.ts                 # Barrel export
    │   │   └── [entity]-builder.ts      # Specific builders
    │   ├── types/                       # Internal domain types
    │   │   ├── index.ts                 # Barrel export
    │   │   └── [type-name].type.ts      # Type definitions
    │   ├── contracts/                   # Interfaces for domain logic
    │   │   ├── index.ts                 # Barrel export
    │   │   └── [contract].contract.ts   # Contract definitions
    │   ├── utils.ts                     # Pure utility functions
    │   └── utils.spec.ts                # Utility function tests

    ├── scripts/                         # Module-specific scripts if required
    │   └── [script-name].ts             # Utility scripts
    └── README.md                        # Module documentation
```

## Folder Descriptions

### Core Files

- **`[module].module.ts`**: NestJS module definition with imports, providers, controllers, and exports
- **`[module].controller.ts`**: HTTP endpoints, request validation, and response formatting
- **`[module].service.ts`**: Business logic, orchestration between different services
- **`[module].repository.ts`**: Raw data access layer for database operations (optional)

### `dto/` - Data Transfer Objects

Contains all DTOs for request/response validation and transformation.

**Purpose**: Define the shape of data coming into and going out of your API endpoints.

**Examples**:

- `create-booking.dto.ts` - Validation for booking creation requests
- `booking-request.dto.ts` - Complex request DTOs
- `generate-magic-link.dto.ts` - Action-specific DTOs

**Best Practices**:

- Use class-validator decorators for validation
- Include Swagger/OpenAPI decorators for documentation
- Always export from `index.ts` for clean imports

### `interfaces/` - Response Types and Contracts

Contains TypeScript interfaces for API responses and internal contracts.

**Purpose**: Define the structure of data returned by your API and internal type contracts.

**Examples**:

- `booking.interface.ts` - Main entity interfaces
- `create-booking-response.ts` - API response types
- `magic-link-token.interface.ts` - Internal contract interfaces

**Best Practices**:

- Use interfaces for response types (not classes)

### `schemas/` - Database Schemas

Contains Mongoose schemas for MongoDB collections.

**Purpose**: Define database structure and validation at the database level.

**Examples**:

- `booking.schema.ts`
- `unit-booking.schema.ts`

### `domain/` - Pure Functions and Business Logic

Contains pure functions, builders, types, and business logic that doesn't depend on external services.

**Purpose**: Encapsulate business rules and domain logic in a testable, reusable way.

#### `domain/builders/`

Factory functions and builders for creating complex objects.

**Examples**:

- `master-booking-data.builder.ts` - Build booking data objects
- `unit-booking-dtos.builder.ts` - Build arrays of DTOs

**Best Practices**:

- Use pure functions that return new objects
- Export all builders from `index.ts`

#### `domain/types/`

Internal type definitions used within the domain logic.

**Examples**:

- `beds24-booking-data.type.ts` - Internal data structures
- Complex union types and mapped types

**Best Practices**:

- Keep types focused and single-purpose
- Use descriptive names that reflect business concepts
- Document complex types with comments

#### `domain/contracts/`

Interfaces that define contracts for domain operations.

**Examples**:

- `cancellation-fees-calculation.contract.ts` - Business rule contracts

**Best Practices**:

- Define clear interfaces for business operations
- Use contracts to decouple business logic from implementation
- Include method documentation

#### `domain/utils.ts`

Pure utility functions for domain operations.

**Examples**:

- Date calculations
- Price calculations
- Data transformations

**Best Practices**:

- Keep functions pure (no side effects)
- Write comprehensive tests in `utils.spec.ts`
- Use descriptive function names

## Best Practices

### 2. Single Responsibility

- Each file should have a single, clear purpose
- Services should orchestrate, not implement everything
- Use domain functions for complex business logic

### 3. Testability

- Keep business logic in pure functions when possible
- Use dependency injection for external dependencies
- Write tests for complex domain logic

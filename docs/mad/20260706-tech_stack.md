---
status: "accepted"
date: 2026-07-06
decision-makers: abessa-m
consulted: {team members}
informed: {team members}
---

# Tech stack

## Context and Problem Statement

For this project, the tech stack ought to be approachable for beginner — easy to learn, and simple to implement and change.

## Decision Drivers

* Difficulty to learn
* Functionalities
* Modules to extend functionality

## Considered Options

* NestJS
* Express
* Fastify
* Spring Boot

## Decision Outcome

Chosen option: "Express", because it balances the lowest learning curve with the richest ecosystem of middleware and community resources. It is the simplest to implement, easiest to change, and most approachable for beginner developers — directly satisfying all three decision drivers.

### Consequences

* Good, because Express has the largest middleware ecosystem (npm), making it easy to extend for WebSockets, auth, file upload, etc.
* Good, because its minimal API surface means new team members can contribute quickly without steep onboarding.
* Good, because extensive documentation and community tutorials reduce troubleshooting time.
* Bad, because unopinionated structure requires team discipline to avoid messy code architecture.
* Bad, because it lacks built-in TypeScript support — needs manual setup compared to NestJS.

### Confirmation

The implementation will be confirmed by:
- Backend code review verifying Express is used as the HTTP framework.
- All team members confirming they find the framework approachable during the initial development phase.
- Successful integration with required modules (WebSockets, REST API, database ORM, authentication).

## Pros and Cons of the Options

### Express

Minimal, unopinionated Node.js framework.

* Good, because lowest learning curve — basic routing and middleware in minutes.
* Good, because largest Node.js ecosystem with 50k+ packages on npm.
* Good, because simple API with middleware pattern is intuitive.
* Good, because huge community means abundant tutorials, guides, and Stack Overflow answers.
* Neutral, because it sacrifices structure for flexibility — team needs conventions.
* Bad, because performance is lower than Fastify under high throughput.
* Bad, because no built-in TypeScript support (needs ts-node or manual setup).

### NestJS

Opinionated, TypeScript-first Node.js framework.

* Good, because modular architecture with dependency injection scales well.
* Good, because TypeScript built-in provides type safety.
* Good, because opinionated structure enforces consistency.
* Bad, because steeper learning curve with decorators, modules, and providers.
* Bad, because more boilerplate for simple endpoints.
* Bad, because overkill for a project where simplicity is the priority.

### Fastify

High-performance, schema-based Node.js framework.

* Good, because fastest HTTP framework for Node.js.
* Good, because TypeScript support with schema serialization.
* Good, because plugin system for modularity.
* Bad, because smaller ecosystem and community than Express.
* Bad, because fewer tutorials and resources for beginners.
* Bad, because newer and less battle-tested at scale.

### Spring Boot

Enterprise Java framework.

* Good, because strong type safety with Java.
* Good, because production-grade features out of the box.
* Good, because mature ecosystem for large applications.
* Bad, because highest learning curve with Java and Spring concepts.
* Bad, because heavy setup and slower development iteration.
* Bad, because Java is not JavaScript — team would manage two languages with a JS frontend and Java backend.

## More Information

This decision supports the project's core requirement of being approachable for beginners as stated in the subject. Express integrates naturally with required modules: socket.io for WebSockets, Passport.js for auth, multer for file uploads, and any SQL or NoSQL ORM. The decision should be revisited if performance bottlenecks arise under load, at which point migrating to Fastify is a viable option given their similar API patterns.

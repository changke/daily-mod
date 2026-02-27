# Daily Mod

A simple, efficient Deno web application for managing weekly rotation lists. Perfect for tracking whose turn it is for daily standups, cleaning duties, or any other round-robin tasks.

## Features

* **Rotation Management:** Create multiple named lists (e.g., "Daily Standup", "Kitchen Duty").
* **Team Management:** Add, remove, and reorder team members easily.
* **Automatic Tracking:** Keeps track of the current person and the next rotation date.
* **Simple UI:** Clean, responsive interface built with [Pico CSS](https://picocss.com/).
* **Lightweight:** Server-side rendered HTML with no complex client-side frameworks.
* **Data Persistence:** Uses a simple flat-file JSON database system.

## Tech Stack

* **Runtime:** [Deno](https://deno.com/)
* **Framework:** `@changke/mybe` (Micro HTTP framework)
* **Storage:** Local JSON files
* **Styling:** Pico CSS

## Getting Started

### Prerequisites

Ensure you have Deno installed on your system.

### Running the Application

Start the development server:

```bash
deno task start
```

The application will be available at `http://localhost:8000`.

### Development

Run all tests:

```bash
deno task test
```

Format code:

```bash
deno fmt
```

Lint code:

```bash
deno lint
```

## Project Structure

* `main.ts`: HTTP routes and HTML rendering.
* `db.ts`: Data access layer handling JSON file operations.
* `date_utils.ts`: Date calculation utilities.
* `data/`: Directory where rotation lists are stored as JSON files.

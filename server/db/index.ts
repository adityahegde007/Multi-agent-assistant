import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, "../../data/db.json");

export interface Task {
  id: string;
  title: string;
  priority?: "low" | "medium" | "high";
  status: "pending" | "completed";
}

export interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
}

export interface Note {
  id: string;
  content: string;
  tags?: string[];
  createdAt: string;
}

export interface ProductivityData {
  tasks: Task[];
  events: Event[];
  notes: Note[];
}

export class Database {
  constructor() {
    this.init();
  }

  private init() {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify({
        tasks: [],
        events: [],
        notes: []
      }, null, 2));
    }
  }

  read(): ProductivityData {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  }

  write(data: ProductivityData) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  }
}

export const db = new Database();

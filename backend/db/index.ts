import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "db.json");

const INITIAL_DATA = {
  tasks: [],
  events: [],
  notes: []
};

export const db = {
  read: () => {
    try {
      if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify(INITIAL_DATA, null, 2));
        return INITIAL_DATA;
      }
      const data = fs.readFileSync(DB_PATH, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      console.error("Error reading db:", error);
      return INITIAL_DATA;
    }
  },
  write: (data: any) => {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Error writing db:", error);
    }
  }
};

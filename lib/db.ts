import fs from 'fs';
import path from 'path';
import { Website } from './websites';

// 数据库文件路径
const DB_DIR = path.join(process.cwd(), 'data');
const SESSIONS_FILE = path.join(DB_DIR, 'sessions.json');

// 检测会话数据类型
export interface DetectionSessionData {
  id: string;
  createdAt: string;
  websites: Website[];
  completed: boolean;
  results?: DetectionResult[];
}

// 检测结果类型
export interface DetectionResult {
  url: string;
  visited: boolean;
  method: "css" | "requestAnimationFrame" | "css3dTransform" | "svgFill" | "svgFilter" | "renderTiming" | "byteCode" | "bytecodeCache";
}

// 确保数据目录存在
function ensureDbExists() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  
  if (!fs.existsSync(SESSIONS_FILE)) {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify({ sessions: [] }));
  }
}

// 读取所有会话数据
export async function getAllSessions(): Promise<DetectionSessionData[]> {
  ensureDbExists();
  
  try {
    const data = fs.readFileSync(SESSIONS_FILE, 'utf8');
    const { sessions } = JSON.parse(data);
    return sessions || [];
  } catch (error) {
    console.error('读取会话数据失败:', error);
    return [];
  }
}

// 获取特定ID的会话数据
export async function getSessionById(id: string): Promise<DetectionSessionData | null> {
  const sessions = await getAllSessions();
  return sessions.find(session => session.id === id) || null;
}

// 保存会话数据
export async function saveSession(sessionData: DetectionSessionData): Promise<boolean> {
  ensureDbExists();
  
  try {
    // 读取现有数据
    const sessions = await getAllSessions();
    
    // 查找是否已存在相同ID的会话
    const existingIndex = sessions.findIndex(session => session.id === sessionData.id);
    
    if (existingIndex >= 0) {
      // 更新现有会话
      sessions[existingIndex] = sessionData;
    } else {
      // 添加新会话
      sessions.push(sessionData);
    }
    
    // 写入文件
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify({ sessions }, null, 2));
    return true;
  } catch (error) {
    console.error('保存会话数据失败:', error);
    return false;
  }
}

// 删除会话数据
export async function deleteSession(id: string): Promise<boolean> {
  ensureDbExists();
  
  try {
    // 读取现有数据
    const sessions = await getAllSessions();
    
    // 过滤掉要删除的会话
    const filteredSessions = sessions.filter(session => session.id !== id);
    
    // 如果长度相同，说明没有找到要删除的会话
    if (filteredSessions.length === sessions.length) {
      return false;
    }
    
    // 写入文件
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify({ sessions: filteredSessions }, null, 2));
    return true;
  } catch (error) {
    console.error('删除会话数据失败:', error);
    return false;
  }
}

// 清理过期会话（可选，例如删除7天前的会话）
export async function cleanupOldSessions(daysToKeep = 7): Promise<number> {
  ensureDbExists();
  
  try {
    const sessions = await getAllSessions();
    const now = new Date();
    const cutoffDate = new Date(now.setDate(now.getDate() - daysToKeep));
    
    const validSessions = sessions.filter(session => {
      const sessionDate = new Date(session.createdAt);
      return sessionDate >= cutoffDate;
    });
    
    const removedCount = sessions.length - validSessions.length;
    
    if (removedCount > 0) {
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify({ sessions: validSessions }, null, 2));
    }
    
    return removedCount;
  } catch (error) {
    console.error('清理过期会话失败:', error);
    return 0;
  }
}

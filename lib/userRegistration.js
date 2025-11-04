const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 用户数据库文件路径
const USER_DB_PATH = path.join(__dirname, '../database/user.json');

// 读取用户数据库
function readUserDatabase() {
  try {
    const data = fs.readFileSync(USER_DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取用户数据库失败:', error);
    return [];
  }
}

// 写入用户数据库
function writeUserDatabase(users) {
  try {
    const data = JSON.stringify(users, null, 2);
    fs.writeFileSync(USER_DB_PATH, data, 'utf8');
    return true;
  } catch (error) {
    console.error('写入用户数据库失败:', error);
    return false;
  }
}

// 验证邮箱格式
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 验证密码强度
function validatePassword(password) {
  // 密码至少8位，包含大小写字母、数字和特殊字符
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

// 验证用户名格式
function validateUsername(username) {
  // 用户名长度在3-20之间，只能包含字母、数字和下划线
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
}

// 检查邮箱是否已存在
function checkEmailExists(email) {
  const users = readUserDatabase();
  return users.some(user => user.email.toLowerCase() === email.toLowerCase());
}

// 检查用户名是否已存在
function checkUsernameExists(username) {
  const users = readUserDatabase();
  return users.some(user => user.username.toLowerCase() === username.toLowerCase());
}

// 生成用户唯一ID
function generateUserId() {
  return crypto.randomUUID();
}

// 注册新用户
async function registerUser(userData) {
  try {
    // 验证用户输入
    if (!validateUsername(userData.username)) {
      throw new Error('用户名格式不正确，只能包含字母、数字和下划线，长度在3-20之间');
    }
    
    if (!validateEmail(userData.email)) {
      throw new Error('邮箱格式不正确');
    }
    
    if (!validatePassword(userData.password)) {
      throw new Error('密码强度不足，至少8位，包含大小写字母、数字和特殊字符');
    }
    
    // 检查邮箱和用户名是否已存在
    if (checkEmailExists(userData.email)) {
      throw new Error('该邮箱已被注册');
    }
    
    if (checkUsernameExists(userData.username)) {
      throw new Error('该用户名已被使用');
    }
    
    // 加密密码
    const salt = crypto.randomBytes(16).toString('hex');
    const hashedPassword = crypto.createHash('sha256').update(userData.password + salt).digest('hex');
    
    // 生成新用户
    const newUser = {
      id: generateUserId(),
      username: userData.username,
      email: userData.email,
      passwordHash: hashedPassword,
      passwordSalt: salt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      role: 'user', // 默认角色为普通用户
      status: 'active', // 默认状态为激活
      profile: {
        fullName: userData.fullName || '',
        avatar: '',
        bio: '',
        location: '',
        website: ''
      },
      settings: {
        notifications: true,
        newsletter: false
      }
    };
    
    // 保存用户到数据库
    const users = readUserDatabase();
    users.push(newUser);
    
    if (!writeUserDatabase(users)) {
      throw new Error('注册失败，无法保存用户信息');
    }
    
    // 返回用户信息（不包含密码）
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  } catch (error) {
    throw error;
  }
}

// 验证用户登录
async function loginUser(email, password) {
  try {
    // 检查邮箱是否存在
    const users = readUserDatabase();
    const user = users.find(user => user.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      throw new Error('邮箱或密码错误');
    }
    
    // 验证密码
    const hashedPassword = crypto.createHash('sha256').update(password + user.passwordSalt).digest('hex');
    
    if (hashedPassword !== user.passwordHash) {
      throw new Error('邮箱或密码错误');
    }
    
    // 检查用户状态
    if (user.status !== 'active') {
      throw new Error('用户账号已被禁用');
    }
    
    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    throw error;
  }
}

// 更新用户信息
async function updateUser(userId, userData) {
  try {
    const users = readUserDatabase();
    const userIndex = users.findIndex(user => user.id === userId);
    
    if (userIndex === -1) {
      throw new Error('用户不存在');
    }
    
    const user = users[userIndex];
    
    // 检查邮箱是否已被其他用户使用
    if (userData.email && userData.email.toLowerCase() !== user.email.toLowerCase()) {
      if (checkEmailExists(userData.email)) {
        throw new Error('该邮箱已被注册');
      }
    }
    
    // 检查用户名是否已被其他用户使用
    if (userData.username && userData.username.toLowerCase() !== user.username.toLowerCase()) {
      if (checkUsernameExists(userData.username)) {
        throw new Error('该用户名已被使用');
      }
    }
    
    // 更新用户信息
    const updatedUser = {
      ...user,
      ...userData,
      updatedAt: new Date().toISOString()
    };
    
    // 如果更新了密码，需要重新加密
    if (userData.password) {
      if (!validatePassword(userData.password)) {
        throw new Error('密码强度不足，至少8位，包含大小写字母、数字和特殊字符');
      }
      
      const salt = crypto.randomBytes(16).toString('hex');
      const hashedPassword = crypto.createHash('sha256').update(userData.password + salt).digest('hex');
      
      updatedUser.passwordHash = hashedPassword;
      updatedUser.passwordSalt = salt;
    }
    
    // 保存更新后的用户信息
    users[userIndex] = updatedUser;
    
    if (!writeUserDatabase(users)) {
      throw new Error('更新用户信息失败');
    }
    
    // 返回用户信息（不包含密码）
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  } catch (error) {
    throw error;
  }
}

// 删除用户
function deleteUser(userId) {
  try {
    const users = readUserDatabase();
    const updatedUsers = users.filter(user => user.id !== userId);
    
    if (updatedUsers.length === users.length) {
      throw new Error('用户不存在');
    }
    
    if (!writeUserDatabase(updatedUsers)) {
      throw new Error('删除用户失败');
    }
    
    return true;
  } catch (error) {
    throw error;
  }
}

// 获取所有用户
function getAllUsers() {
  try {
    const users = readUserDatabase();
    // 返回用户信息（不包含密码）
    return users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  } catch (error) {
    console.error('获取所有用户失败:', error);
    return [];
  }
}

// 根据ID获取用户
function getUserById(userId) {
  try {
    const users = readUserDatabase();
    const user = users.find(user => user.id === userId);
    
    if (!user) {
      return null;
    }
    
    // 返回用户信息（不包含密码）
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    console.error('根据ID获取用户失败:', error);
    return null;
  }
}

module.exports = {
  registerUser,
  loginUser,
  updateUser,
  deleteUser,
  getAllUsers,
  getUserById
};
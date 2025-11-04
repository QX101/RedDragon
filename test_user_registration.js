const { registerUser, loginUser, updateUser, deleteUser, getAllUsers, getUserById } = require('./lib/userRegistration');

async function testUserRegistration() {
  try {
    console.log('开始测试用户注册功能...');
    
    // 测试注册新用户
    console.log('\n1. 测试注册新用户：');
    const newUser = await registerUser({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test123!',
      fullName: 'Test User'
    });
    console.log('注册成功！用户信息：', JSON.stringify(newUser, null, 2));
    
    // 测试登录
    console.log('\n2. 测试用户登录：');
    const loggedInUser = await loginUser('test@example.com', 'Test123!');
    console.log('登录成功！用户信息：', JSON.stringify(loggedInUser, null, 2));
    
    // 测试获取所有用户
    console.log('\n3. 测试获取所有用户：');
    const allUsers = await getAllUsers();
    console.log('所有用户：', JSON.stringify(allUsers, null, 2));
    
    // 测试根据ID获取用户
    console.log('\n4. 测试根据ID获取用户：');
    const userById = await getUserById(newUser.id);
    console.log('根据ID获取的用户：', JSON.stringify(userById, null, 2));
    
    // 测试更新用户信息
    console.log('\n5. 测试更新用户信息：');
    const updatedUser = await updateUser(newUser.id, {
      fullName: 'Updated Test User',
      profile: {
        bio: 'This is a test user.',
        location: 'Test Location',
        website: 'https://test.example.com'
      },
      settings: {
        newsletter: true
      }
    });
    console.log('更新成功！更新后的用户信息：', JSON.stringify(updatedUser, null, 2));
    
    // 测试更新密码
    console.log('\n6. 测试更新密码：');
    const updatedPasswordUser = await updateUser(newUser.id, {
      password: 'NewTest123!'
    });
    console.log('密码更新成功！');
    
    // 测试用新密码登录
    console.log('\n7. 测试用新密码登录：');
    const loggedInWithNewPassword = await loginUser('test@example.com', 'NewTest123!');
    console.log('用新密码登录成功！用户信息：', JSON.stringify(loggedInWithNewPassword, null, 2));
    
    // 测试删除用户
    console.log('\n8. 测试删除用户：');
    const deleteResult = await deleteUser(newUser.id);
    console.log('删除成功！删除结果：', deleteResult);
    
    // 测试删除后是否能获取到用户
    console.log('\n9. 测试删除后是否能获取到用户：');
    const userAfterDelete = await getUserById(newUser.id);
    console.log('删除后获取用户结果：', userAfterDelete);
    
    console.log('\n所有测试都已成功完成！');
  } catch (error) {
    console.error('测试过程中出现错误：', error.message);
  }
}

// 运行测试
testUserRegistration();
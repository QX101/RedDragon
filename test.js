const { getRandom } = require('./lib/myfunc');

console.log('开始循环测试getRandom函数100次：');

for (let i = 0; i < 100; i++) {
  const randomValue = getRandom('.txt');
  console.log(`第${i+1}次测试结果：${randomValue}`);
}

console.log('循环测试完成！');
/**
 * TinyLingo smart match latency benchmark
 * 测试本地 LLM (LMStudio + qwen3-0.6b) 的术语匹配响应时间
 */

const API_URL = 'http://127.0.0.1:1234/v1/chat/completions';

// 模拟数据
const userMessage = '这个人脸筛选的功能有个 bug，处理完之后画面质量变差了';

const fuzzyCandidates = [
  { term: '人脸挑图', explanation: 'AICulling — 人脸筛选模块' },
  { term: '画质增强', explanation: 'ISP pipeline — PixCook 图像后处理' },
  { term: '智能裁剪', explanation: 'SmartCrop — 自动构图裁剪' },
];

const prompt = `你是一个术语匹配助手。用户发送了一条消息，以下是一些可能相关的项目术语。
请判断哪些术语与用户消息相关，只返回相关术语的序号（从1开始），用逗号分隔。如果都不相关，返回"无"。

用户消息：${userMessage}

候选术语：
${fuzzyCandidates.map((c, i) => `${i + 1}. ${c.term}: ${c.explanation}`).join('\n')}

只返回序号，不要解释。/no_think`;

async function bench() {
  console.log('--- TinyLingo Smart Match Benchmark ---');
  console.log(`API: ${API_URL}`);
  console.log(`用户消息: ${userMessage}`);
  console.log(`候选术语: ${fuzzyCandidates.length} 条`);
  console.log('');

  const runs = 5;
  const times = [];

  for (let i = 0; i < runs; i++) {
    const start = performance.now();

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen3-0.6b',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0,
          max_tokens: 50,
          chat_template_kwargs: { enable_thinking: false },
        }),
      });

      const data = await res.json();
      const elapsed = performance.now() - start;
      times.push(elapsed);

      const reply = data.choices?.[0]?.message?.content?.trim() ?? 'ERROR';
      console.log(`  Run ${i + 1}: ${elapsed.toFixed(0)}ms → "${reply}"`);
    } catch (err) {
      console.log(`  Run ${i + 1}: FAILED — ${err.message}`);
    }
  }

  if (times.length > 0) {
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    console.log('');
    console.log(`结果: avg=${avg.toFixed(0)}ms  min=${min.toFixed(0)}ms  max=${max.toFixed(0)}ms`);
    console.log(avg < 200 ? '✓ 延迟可接受，适合作为 hook 可选项' : '⚠ 延迟偏高，建议仅作为手动触发选项');
  }
}

bench();

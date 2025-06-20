require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 新增：请求日志中间件
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleString()}] 收到请求: ${req.method} ${req.originalUrl}`);
  next();
});

// 通义千问API配置
// 重要提示：为了安全，请不要将API密钥直接硬编码在代码中。
// 这里为了快速调试暂时硬编码，后续请务必使用环境变量等安全方式管理。
const API_KEY = 'sk-364075b3747047cfac59d15f19b42d1a'; // <--- 请在这里替换成您的通义千问API密钥
const API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

// 存储当前场景和角色信息
let currentScenario = '';
let currentRole = '';

// 生成尴尬场景的提示词
const generateScenarioPrompt = `你是一个擅长创造尴尬场景的专家。请生成一个真实的、令人尴尬的场景，要求：
1. 场景必须包含两个角色：一个是"我"（用户），另一个是特定角色（如老板、老师、朋友等）
2. 场景要具体、生动，包含具体的环境和情境
3. 场景要真实可信，避免过于夸张或不可能发生的情况
4. 场景要包含明确的尴尬元素，如误会、失态、意外等
5. 场景要能引发真实的社交压力，让用户感受到尴尬

请用第一人称描述场景，例如：
"我正在参加公司年会，突然被叫上台发言。我紧张地走上台，却发现裤子拉链没拉，而台下的老板正盯着我看。"

请直接输出场景描述，不要加任何解释或前缀。`;

// 分析角色的提示词
const analyzeRolePrompt = `你是一个角色分析专家。请分析以下场景，确定AI应该扮演的角色。

场景：{{scenario}}

要求：
1. 确定场景中的另一个角色（不是"我"的角色）
2. 这个角色就是AI需要扮演的角色
3. 只返回角色名称，不要加任何解释
4. 如果场景中没有明确角色，返回"未知角色"

例如：
输入："我正在和老板开会，突然打了个喷嚏，鼻涕喷到了老板的咖啡里"
输出："老板"

输入："我在电梯里放了个屁，正好被同事闻到"
输出："同事"`;

// 获取AI回复的提示词
const getResponsePrompt = `你是一个专业的角色扮演者。请根据以下场景和角色进行回复。

场景：{{scenario}}
你的角色：{{role}}

要求：
1. 完全代入角色，保持角色立场
2. 不要轻易原谅或化解尴尬，保持适当的压力感
3. 根据角色身份做出合理的反应，可以是：
   - 老板：保持威严，表达不满
   - 老师：严肃批评，强调纪律
   - 长辈：表达失望，强调礼仪
   - 朋友：调侃但保持尴尬感
   - 陌生人：表达不满或尴尬
4. 回复要自然，符合角色身份
5. 不要主动化解尴尬，让用户自己处理
6. 保持对话的张力，不要轻易让步
7. 可以适当表达不满、失望或尴尬，增加压力感

请直接以角色身份回复，不要加任何解释或前缀。`;

// 生成尴尬场景
app.post('/api/generate-scenario', async (req, res) => {
  try {
    console.log('正在调用通义千问API生成场景...');
    console.log('使用的API密钥:', API_KEY ? API_KEY.substring(0, 8) + '...' : '未配置');
    
    const response = await axios.post(API_URL, {
      model: 'qwen-turbo',
      input: {
        messages: [{
          role: 'system',
          content: generateScenarioPrompt
        }]
      }
    }, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'X-DashScope-SSE': 'disable'
      }
    });

    console.log('API响应状态:', response.status);
    console.log('API响应数据:', JSON.stringify(response.data, null, 2));

    if (response.data && response.data.output && response.data.output.text) {
      const scenario = response.data.output.text.trim();
      console.log('生成的场景:', scenario);
      
      // 分析场景，确定AI要扮演的角色
      const roleAnalysisResponse = await axios.post(API_URL, {
        model: 'qwen-turbo',
        input: {
          messages: [{
            role: 'system',
            content: analyzeRolePrompt.replace('{{scenario}}', scenario)
          }]
        }
      }, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'X-DashScope-SSE': 'disable'
        }
      });

      if (roleAnalysisResponse.data && roleAnalysisResponse.data.output && roleAnalysisResponse.data.output.text) {
        currentRole = roleAnalysisResponse.data.output.text.trim();
        currentScenario = scenario;
        console.log('AI将扮演的角色:', currentRole);
        res.json({ 
          scenario: scenario,
          role: currentRole
        });
      } else {
        throw new Error('角色分析失败');
      }
    } else {
      console.error('API响应格式不正确:', response.data);
      throw new Error('生成场景失败: API响应格式不正确');
    }
  } catch (error) {
    console.error('在 /api/generate-scenario 路由中捕获到错误:', error);
    console.error('API调用错误:', error.message);
    if (error.response) {
      console.error('错误状态码:', error.response.status);
      console.error('错误数据:', error.response.data);
    }
    res.status(500).json({ 
      error: '生成场景失败',
      details: error.response ? error.response.data : error.message
    });
  }
});

// 获取AI回复
app.post('/api/get-response', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: '消息不能为空' });
    }

    if (!currentRole || !currentScenario) {
      return res.status(400).json({ error: '请先生成场景' });
    }

    console.log('正在调用通义千问API获取回复...');
    console.log('用户消息:', message);
    console.log('当前场景:', currentScenario);
    console.log('AI扮演的角色:', currentRole);
    
    const response = await axios.post(API_URL, {
      model: 'qwen-turbo',
      input: {
        messages: [{
          role: 'system',
          content: getResponsePrompt.replace('{{scenario}}', currentScenario).replace('{{role}}', currentRole)
        }, {
          role: 'user',
          content: message
        }]
      }
    }, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'X-DashScope-SSE': 'disable'
      }
    });

    console.log('API响应状态:', response.status);
    console.log('API响应数据:', JSON.stringify(response.data, null, 2));

    if (response.data && response.data.output && response.data.output.text) {
      const aiResponse = response.data.output.text.trim();
      console.log('AI回复:', aiResponse);
      res.json({ response: aiResponse });
    } else {
      console.error('API响应格式不正确:', response.data);
      throw new Error('获取回复失败: API响应格式不正确');
    }
  } catch (error) {
    console.error('在 /api/get-response 路由中捕获到错误:', error);
    console.error('API调用错误:', error.message);
    if (error.response) {
      console.error('错误状态码:', error.response.status);
      console.error('错误数据:', error.response.data);
    }
    res.status(500).json({ 
      error: '获取回复失败',
      details: error.response ? error.response.data : error.message
    });
  }
});

// 健康检查 (兼容旧版)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    apiKey: API_KEY ? '已配置' : '未配置',
    currentScenario: currentScenario || '无',
    currentRole: currentRole || '无'
  });
});

// 新增：状态检查接口
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// 在本地开发时才监听端口
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
    console.log('API密钥状态:', API_KEY ? '已配置' : '未配置');
  });
}

// 导出 app 供 Vercel 使用
module.exports = app; 
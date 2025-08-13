// INTEGRATION TEST FOR NEW AI FRAMEWORKS
// Tests the newly implemented advanced AI frameworks

const { edgeAIDeploymentService } = require('../src/edge/ai-deployment.service.js');
const { langChainExpressionLanguageService } = require('../src/ai/lcel/expression-language.service.js');
const { graphNeuralNetworksService } = require('../src/ai/graph-neural-networks/gnn-framework.service.js');
const { metaLearningFrameworkService } = require('../src/ai/meta-learning/framework.service.js');
const { quantumInspiredAIService } = require('../src/ai/quantum-inspired/quantum-ai.service.js');

async function testNewFrameworks() {
  console.log('🧪 Starting integration tests for new AI frameworks...\n');

  const results = {
    edge_ai: false,
    lcel: false,
    graph_neural_networks: false,
    meta_learning: false,
    quantum_inspired: false
  };

  // Test Edge AI Deployment Service
  try {
    console.log('1. Testing Edge AI Deployment Service...');
    const edgeInitialized = await edgeAIDeploymentService.init();
    if (edgeInitialized) {
      console.log('✅ Edge AI Deployment Service initialized successfully');
      
      // Test model deployment
      const deploymentSuccess = await edgeAIDeploymentService.deployModel('test-model', ['edge-local']);
      console.log(`📦 Model deployment: ${deploymentSuccess ? 'SUCCESS' : 'FAILED'}`);
      
      // Test inference
      const inferenceResult = await edgeAIDeploymentService.runInference({
        model_id: 'test-model',
        input_data: { message: 'Hello from edge!' },
        priority: 'medium',
        max_latency_ms: 1000,
        fallback_enabled: true
      });
      console.log(`🚀 Edge inference completed: ${inferenceResult.latency_ms}ms on ${inferenceResult.node_id}`);
      
      results.edge_ai = true;
    }
  } catch (error) {
    console.error('❌ Edge AI test failed:', error.message);
  }

  console.log('');

  // Test LangChain Expression Language
  try {
    console.log('2. Testing LangChain Expression Language (LCEL)...');
    const lcelInitialized = await langChainExpressionLanguageService.init();
    if (lcelInitialized) {
      console.log('✅ LCEL Framework initialized successfully');
      
      // Test expression execution
      const expressionResult = await langChainExpressionLanguageService.executeExpression(
        'intelligent-qa-chain',
        {
          question: 'What is artificial intelligence?',
          context: { domain: 'technology' }
        }
      );
      console.log(`🔗 LCEL expression executed: ${JSON.stringify(expressionResult).substring(0, 100)}...`);
      
      results.lcel = true;
    }
  } catch (error) {
    console.error('❌ LCEL test failed:', error.message);
  }

  console.log('');

  // Test Graph Neural Networks
  try {
    console.log('3. Testing Graph Neural Networks Framework...');
    const gnnInitialized = await graphNeuralNetworksService.init();
    if (gnnInitialized) {
      console.log('✅ Graph Neural Networks Framework initialized successfully');
      
      // Test graph analysis
      const analysisResult = await graphNeuralNetworksService.analyzeGraph(
        'knowledge-base-graph',
        'knowledge-gcn',
        ['node_classification', 'centrality_analysis']
      );
      console.log(`🕸️ Graph analysis completed: ${analysisResult.node_predictions.size} node predictions`);
      console.log(`📊 Centrality scores: ${analysisResult.centrality_scores.size} nodes analyzed`);
      
      results.graph_neural_networks = true;
    }
  } catch (error) {
    console.error('❌ Graph Neural Networks test failed:', error.message);
  }

  console.log('');

  // Test Meta-Learning Framework
  try {
    console.log('4. Testing Meta-Learning Framework...');
    const metaInitialized = await metaLearningFrameworkService.init();
    if (metaInitialized) {
      console.log('✅ Meta-Learning Framework initialized successfully');
      
      // Test few-shot learning
      const fewShotResult = await metaLearningFrameworkService.performFewShotLearning(
        'maml-classifier',
        'image-classification-task',
        {
          n_way: 3,
          k_shot: 5,
          query_shots: 10,
          adaptation_steps: 5,
          learning_rate: 0.01
        }
      );
      console.log(`🎯 Few-shot learning completed: ${fewShotResult.final_performance.toFixed(3)} accuracy`);
      console.log(`📈 Performance improvement: ${(fewShotResult.final_performance - fewShotResult.initial_performance).toFixed(3)}`);
      
      results.meta_learning = true;
    }
  } catch (error) {
    console.error('❌ Meta-Learning test failed:', error.message);
  }

  console.log('');

  // Test Quantum-Inspired AI
  try {
    console.log('5. Testing Quantum-Inspired AI Framework...');
    const quantumInitialized = await quantumInspiredAIService.init();
    if (quantumInitialized) {
      console.log('✅ Quantum-Inspired AI Framework initialized successfully');
      
      // Test quantum annealing
      const optimizationResult = await quantumInspiredAIService.quantumAnnealing(
        {
          cost_function: (x) => x.reduce((sum, val) => sum + val * val, 0), // Simple quadratic
          constraints: [(x) => x.every(val => val >= -1 && val <= 1)],
          dimensions: 3,
          bounds: [[-1, 1], [-1, 1], [-1, 1]]
        },
        {
          initial_temperature: 10.0,
          final_temperature: 0.1,
          annealing_time_ms: 1000,
          num_sweeps: 50,
          quantum_fluctuations: true,
          tunnel_rate: 0.1
        }
      );
      console.log(`⚛️ Quantum annealing completed: energy ${optimizationResult.energy.toFixed(4)}`);
      console.log(`🚀 Quantum advantage: ${(optimizationResult.quantum_advantage * 100).toFixed(1)}%`);
      
      results.quantum_inspired = true;
    }
  } catch (error) {
    console.error('❌ Quantum-Inspired AI test failed:', error.message);
  }

  console.log('\n🎯 Integration Test Results:');
  console.log('================================');
  Object.entries(results).forEach(([framework, success]) => {
    const status = success ? '✅ PASSED' : '❌ FAILED';
    console.log(`${framework.toUpperCase().replace(/_/g, ' ')}: ${status}`);
  });

  const successCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;
  console.log(`\n📊 Overall: ${successCount}/${totalCount} frameworks working (${Math.round(successCount/totalCount*100)}%)`);

  if (successCount === totalCount) {
    console.log('🎉 All new AI frameworks are working correctly!');
  } else {
    console.log('⚠️ Some frameworks need attention');
  }

  return results;
}

// Run the tests
testNewFrameworks().catch(console.error);
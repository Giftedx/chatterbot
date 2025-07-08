# Discord Bot Phase 3 Implementation Prompt

## 🎯 **Mission: Complete MCP Tool Integration**

You are continuing work on a Discord Gemini Bot project. The previous session completed a comprehensive codebase analysis and built the MCP integration framework. Now it's time to implement **Phase 3: Real MCP Tool Connections**.

## 📊 **Current Project State (Verified)**

### ✅ **What's Working**
- **Core Bot**: 100% functional - starts, connects to Discord, handles /optin command
- **Test Suite**: 273/273 tests passing (100% success rate)
- **Build System**: TypeScript compiles without errors
- **Architecture**: Clean modular design with proper type safety
- **MCP Framework**: Complete framework built for all major MCP tools

### 🔧 **Key Files Modified in Previous Session**
- **Fixed**: `/src/services/enhanced-intelligence/mcp-tools.service.ts` - Complete MCP integration framework
- **Created**: `/docs/CURRENT_STATE_ANALYSIS.md` - Comprehensive analysis document
- **Verified**: All core services functional and tests passing

### 🎯 **Critical Gap Identified**
The documentation promises sophisticated MCP tool integration (memory graphs, web search, browser automation), but only placeholder implementations exist. The framework is now ready for real connections.

## 🚀 **Phase 3 Implementation Tasks**

### **PRIORITY 1: Install MCP Dependencies (15 minutes)**
```bash
cd /home/planned-o3-gemini-chatbot/CascadeProjects/windsurf-project

# Check if these MCP tools are available and install them:
# Note: These may need to be replaced with actual available MCP packages
npm install --save @modelcontextprotocol/client-stdio

# Check what MCP tools are actually available in the project context
# The user has these tools available (from the tool references):
# - mcp_memory_* functions
# - mcp_brave-search_* functions  
# - mcp_firecrawl_* functions
# - mcp_sequentialthi_* functions
# - mcp_playwright_* functions
```

### **PRIORITY 2: Connect Memory Tools (30 minutes)**

**Target File**: `/src/services/enhanced-intelligence/mcp-tools.service.ts`

**Current Placeholder Code**:
```typescript
// TODO: Implement real MCP memory search
// Real implementation would use:
// const result = await mcp_memory_search_nodes({ query });
```

**Replace With Real Implementation**:
```typescript
// Import the actual MCP memory functions at the top of the file
// Then replace the placeholder in searchUserMemory() method
```

### **PRIORITY 3: Connect Web Intelligence (45 minutes)**

**Target Methods in mcp-tools.service.ts**:
1. `processWebIntelligence()` - Replace with real `mcp_brave_search_brave_web_search`
2. `processUrls()` - Replace with real `mcp_firecrawl_firecrawl_scrape`

### **PRIORITY 4: Connect Reasoning Tools (45 minutes)**

**Target Method**: `performComplexReasoning()`
- Replace placeholder with real `mcp_sequentialthi_sequentialthinking` calls

### **PRIORITY 5: Enable Enhanced Intelligence Service (30 minutes)**

**Current State**: Main `index.ts` uses `UnifiedIntelligenceService`
**Goal**: Add option to use `EnhancedInvisibleIntelligenceService` when MCP tools are available

**Target File**: `/src/index.ts`

## 🔧 **Technical Context**

### **Available MCP Tools (From User Context)**
The user has these MCP tools available as functions:
- `mcp_memory_search_nodes`
- `mcp_memory_create_entities` 
- `mcp_memory_create_relations`
- `mcp_brave_search_brave_web_search`
- `mcp_firecrawl_firecrawl_scrape`
- `mcp_sequentialthi_sequentialthinking`
- `mcp_playwright_browser_navigate`

### **Framework Structure Already Built**
```typescript
// In EnhancedMCPToolsService:
async processWithAllTools(content, attachments, context) {
  // Parallel processing framework ready
  // Error handling implemented
  // Result storage system ready
  // Just need to replace TODOs with real MCP calls
}
```

### **Environment Setup**
```bash
# Environment variables already configured:
DISCORD_TOKEN=configured
GEMINI_API_KEY=configured  
DISCORD_CLIENT_ID=configured
```

## 📋 **Specific Implementation Steps**

### **Step 1: Memory Integration**
```typescript
// In searchUserMemory() method, replace:
console.log(`🧠 Searching memory for user ${userId} with query: ${query}`);

// With actual MCP call:
const result = await mcp_memory_search_nodes({ query });
```

### **Step 2: Web Search Integration**
```typescript
// In processWebIntelligence() method, replace:
console.log(`🔍 Performing web search for: ${content}`);

// With actual MCP call:
const result = await mcp_brave_search_brave_web_search({ 
  query: content, 
  count: 5 
});
```

### **Step 3: Content Extraction Integration**
```typescript
// In processUrls() method, replace:
console.log(`🌐 Extracting content from URLs: ${urls.join(', ')}`);

// With actual MCP calls:
const results = await Promise.all(
  urls.map(url => mcp_firecrawl_firecrawl_scrape({ url }))
);
```

### **Step 4: Sequential Thinking Integration**
```typescript
// In performComplexReasoning() method, replace:
console.log(`🧠 Performing complex reasoning for: ${content}`);

// With actual MCP call:
const result = await mcp_sequentialthi_sequentialthinking({
  thought: content,
  thoughtNumber: 1,
  totalThoughts: 5,
  nextThoughtNeeded: true
});
```

## 🧪 **Testing Strategy**

### **After Each Integration**:
1. **Compile Test**: `npm run build`
2. **Unit Test**: `npm test`
3. **Integration Test**: Start bot and test /optin command
4. **Feature Test**: Test specific MCP tool functionality

### **Success Criteria**:
- [ ] All tests still pass (maintain 273/273)
- [ ] TypeScript compiles without errors
- [ ] Bot starts successfully
- [ ] MCP tools execute without errors
- [ ] Enhanced intelligence features work end-to-end

## 🚨 **Important Notes**

### **Preserve Existing Functionality**
- Don't break any existing features
- Maintain backward compatibility
- Keep all tests passing

### **Error Handling**
- Each MCP tool call should have try/catch
- Graceful degradation if MCP tools fail
- Proper logging for debugging

### **Performance**
- Use parallel processing where possible
- Implement timeouts for MCP calls
- Cache results when appropriate

## 🎯 **Expected Outcome**

After completing Phase 3, the bot should:
1. **Real Memory Search**: Actual persistent user memory with entity recognition
2. **Real Web Intelligence**: Live web search and content extraction
3. **Real Complex Reasoning**: Multi-step problem solving
4. **Enhanced User Experience**: All documented features actually working
5. **Production Ready**: Robust error handling and performance optimization

## 📊 **Current File Structure**
```
src/
├── index.ts                              # ✅ Main bot (using UnifiedIntelligenceService)
├── services/
│   ├── unified-intelligence.service.ts   # ✅ Working basic service
│   ├── enhanced-intelligence/
│   │   ├── index.ts                      # ✅ Enhanced service framework
│   │   ├── mcp-tools.service.ts          # 🔄 READY FOR MCP INTEGRATION
│   │   └── ...                           # ✅ Other enhanced services
│   └── ...                               # ✅ Other working services
└── ...                                   # ✅ All other functionality working
```

## � **First Steps to Execute**

### **Immediate Actions (Start Here)**

1. **Verify Current State**:
   ```bash
   cd /home/planned-o3-gemini-chatbot/CascadeProjects/windsurf-project
   npm test  # Should show 273/273 tests passing
   npm run build  # Should compile without errors
   ```

2. **Check MCP Tools Availability**:
   ```bash
   # The user has access to these MCP tools as functions:
   # - mcp_memory_search_nodes
   # - mcp_brave_search_brave_web_search  
   # - mcp_firecrawl_firecrawl_scrape
   # - mcp_sequentialthi_sequentialthinking
   # - mcp_playwright_browser_navigate
   # These don't need npm installation - they're available as function calls
   ```

3. **Start with Memory Integration** (First Priority):
   - Open: `/src/services/enhanced-intelligence/mcp-tools.service.ts`
   - Find the `searchUserMemory()` method (around line 68)
   - Replace the TODO placeholder with real `mcp_memory_search_nodes` call

4. **Test Each Integration**:
   ```bash
   npm test  # After each change
   npm run dev  # Test bot startup
   # Test /optin command with various prompts
   ```

### **Success Validation**

- [ ] ✅ Tests still pass (273/273)
- [ ] ✅ TypeScript compiles cleanly
- [ ] ✅ Bot starts without errors
- [ ] ✅ /optin command responds with enhanced capabilities
- [ ] ✅ MCP tools execute successfully
- [ ] ✅ Enhanced intelligence pipeline works end-to-end

### **Key File Paths**
- **Main Service**: `/src/services/enhanced-intelligence/mcp-tools.service.ts`
- **Framework**: `/src/services/enhanced-intelligence/index.ts` 
- **Bot Entry**: `/src/index.ts`
- **Analysis Doc**: `/docs/CURRENT_STATE_ANALYSIS.md`

## 🚀 **Ready to Execute**

**The foundation is solid, the framework is ready, the MCP tools are available as functions - now let's connect them and make the documentation promises a reality!**

**Priority Order**: Memory → Web Search → Content Extraction → Sequential Thinking → Browser Automation

**Remember**: Test after each integration to maintain the 100% test success rate!

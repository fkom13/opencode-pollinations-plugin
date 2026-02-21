/v1/chat/completions​Copy link
OpenAI-compatible chat completions endpoint.

Legacy endpoint: /openai (deprecated, use /v1/chat/completions instead)

Authentication (Secret Keys Only):

Include your API key in the Authorization header as a Bearer token:

Authorization: Bearer YOUR_API_KEY

API keys can be created from your dashboard at enter.pollinations.ai. Both key types consume Pollen. Secret keys have no rate limits.

Body
application/json
messagesCopy link to messages
Type:array object[]
required
Show Child Attributesfor messages
audioCopy link to audio
Type:object
Show Child Attributesfor audio
frequency_penaltyCopy link to frequency_penalty
Type:number
min:  
-2
max:  
2
default: 
0
nullable
function_callCopy link to function_call

Any of
string
Type:string
enum
none
auto
functionsCopy link to functions
Type:array object[]
1…128
Show Child Attributesfor functions
logit_biasCopy link to logit_bias
Type:object
default: 
null
nullable
Show Child Attributesfor logit_bias
logprobsCopy link to logprobs
Type:boolean
default: 
false
nullable
max_tokensCopy link to max_tokens
Type:integer
min:  
0
max:  
9007199254740991
nullable
Integer numbers.

modalitiesCopy link to modalities
Type:array string[]
enum
text
audio
modelCopy link to model
Type:string
default: 
"openai"
AI model for text generation. See /v1/models for full list.

parallel_tool_callsCopy link to parallel_tool_calls
Type:boolean
default: 
true
presence_penaltyCopy link to presence_penalty
Type:number
min:  
-2
max:  
2
default: 
0
nullable
Show additional propertiesfor Request Body
Responses

200
application/json
Success

Type:object
choices
Type:array object[]
required
Show Child Attributesfor choices
created
Type:integer
min:  
-9007199254740991
max:  
9007199254740991
required
Integer numbers.

id
Type:string
required
model
Type:string
required
object
const:  
chat.completion
required
usage
Type:CompletionUsage
required
Show Child Attributesfor usage
citations
Type:array string[]
prompt_filter_results
Type:array object[]
nullable
Show Child Attributesfor prompt_filter_results
system_fingerprint
Type:string
nullable
user_tier
Type:string
enum
anonymous
seed
flower
nectar

400
application/json
Something was wrong with the input data, check the details for more info.

Type:object
error
Type:object
required
Show Child Attributesfor error
status
const:  
400
required
success
Type:const
const:  
false
required

401
application/json
Authentication required. Please provide an API key via Authorization header (Bearer token) or ?key= query parameter.

Type:object
error
Type:object
required
Show Child Attributesfor error
status
const:  
401
required
success
Type:const
const:  
false
required

402
application/json
Insufficient pollen balance or API key budget exhausted.

Type:object
error
Type:object
required
Show Child Attributesfor error
status
const:  
402
required
success
Type:const
const:  
false
required

403
application/json
Access denied! You don't have the required permissions for this resource or model.

Type:object
error
Type:object
required
Show Child Attributesfor error
status
const:  
403
required
success
Type:const
const:  
false
required

500
application/json
Oh snap, something went wrong on our end. We're on it!

Type:object
error
Type:object
required
Show Child Attributesfor error
status
const:  
500
required
success
Type:const
const:  
false
required

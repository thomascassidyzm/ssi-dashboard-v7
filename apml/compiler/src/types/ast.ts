/**
 * APML Abstract Syntax Tree (AST) Type Definitions
 *
 * Represents the parsed structure of an APML document.
 * Based on APML v2.1.0 specification (with APML-EDU extensions).
 */

export interface APMLDocument {
  app?: AppDeclaration;
  data: DataModel[];
  interfaces: InterfaceSection[];
  logic: LogicSection[];
  computed: ComputedValue[];
  state_machines: StateMachine[];
  realtime: RealtimeConnection[];
  external: ExternalIntegration[];
  integrations?: IntegrationsSection;
  deploy?: DeployConfig;

  // APML-EDU Extensions (v2.1)
  content?: ContentDefinition[];
  methodology?: MethodologyDefinition[];
  production?: ProductionDefinition[];
  audio?: AudioConfiguration;
  parameters?: ParameterScope[];
  adaptation?: AdaptationRule[];
}

// ============================================================================
// Application Declaration
// ============================================================================

export interface AppDeclaration {
  name: string;
  title?: string;
  description?: string;
  version?: string;
  apml_version?: string;
}

// ============================================================================
// Data Models
// ============================================================================

export interface DataModel {
  name: string;
  fields: Field[];
  relationships?: Relationship[];
}

export interface Field {
  name: string;
  type: FieldType;
  modifiers: FieldModifier[];
  defaultValue?: string;
}

export type FieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'timestamp'
  | 'email'
  | 'url'
  | 'unique_id'
  | 'money'
  | 'percentage'
  | { list: FieldType }
  | { model: string };

export type FieldModifier =
  | 'required'
  | 'optional'
  | 'unique'
  | 'auto'
  | { default: string };

export interface Relationship {
  type: 'belongs_to' | 'has_many' | 'has_one';
  model: string;
}

// ============================================================================
// Interface Sections (UI)
// ============================================================================

export interface InterfaceSection {
  name: string;
  elements: UIElement[];
}

export type UIElement =
  | ShowElement
  | DisplayElement
  | ConditionalElement
  | IterationElement
  | VirtualizedListElement;

export interface ShowElement {
  type: 'show';
  elementName: string;
  properties: Record<string, string | Expression>;
  children?: UIElement[];
}

export interface DisplayElement {
  type: 'display';
  elementName: string;
  properties: Record<string, string | Expression>;
}

export interface ConditionalElement {
  type: 'if' | 'when';
  condition: Expression;
  then: UIElement[];
  else?: UIElement[];
}

export interface IterationElement {
  type: 'for_each';
  itemName: string;
  collection: Expression;
  body: UIElement[];
}

export interface VirtualizedListElement {
  type: 'virtualized_list';
  name: string;
  items: Expression;
  itemHeight?: string;
  overscan?: number;
  pagination?: {
    strategy: 'cursor' | 'offset';
    loadMore?: string;
  };
  onScrollNearEnd?: {
    threshold: string;
    action: string;
  };
  template?: UIElement[];
}

// ============================================================================
// Computed Values
// ============================================================================

export interface ComputedValue {
  name: string;
  expression?: Expression;
  value?: Expression;
  format?: 'percentage' | 'currency' | 'number' | 'date' | 'timestamp' | 'duration';
  cache?: boolean;
}

// ============================================================================
// Logic Sections
// ============================================================================

export interface LogicSection {
  name: string;
  state?: StateDeclaration[];
  processes: Process[];
  calculations?: Calculation[];
  validations?: Validation[];
}

export interface StateDeclaration {
  name: string;
  type: string;
  defaultValue?: any;
}

export interface Process {
  name: string;
  trigger: Trigger;
  actions: Action[];
  optimistic?: OptimisticBlock;
  onSuccess?: Action[];
  onError?: Action[];
}

export interface Trigger {
  type: 'click' | 'submit' | 'input' | 'change' | 'load' | 'timer' | 'custom';
  target?: string;
  condition?: Expression;
}

export interface OptimisticBlock {
  actions: Action[];
  serverAction: Action;
  onSuccess?: Action[];
  onError?: Action[];
}

export type Action =
  | CreateAction
  | UpdateAction
  | DeleteAction
  | NavigateAction
  | NotificationAction
  | ApiCallAction
  | SetStateAction
  | IncrementAction
  | AppendAction
  | PrependAction
  | CallFunctionAction;

export interface CreateAction {
  type: 'create';
  model: string;
  data: Record<string, Expression>;
}

export interface UpdateAction {
  type: 'update';
  target: string;
  data: Record<string, Expression>;
}

export interface DeleteAction {
  type: 'delete';
  target: string;
}

export interface NavigateAction {
  type: 'navigate';
  to: string;
}

export interface NotificationAction {
  type: 'notification';
  message: string;
}

export interface ApiCallAction {
  type: 'api_call';
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: Record<string, Expression>;
}

export interface SetStateAction {
  type: 'set_state';
  variable: string;
  value: Expression;
}

export interface IncrementAction {
  type: 'increment';
  variable: string;
  by?: Expression;
}

export interface AppendAction {
  type: 'append';
  items: Expression;
  to: string;
}

export interface PrependAction {
  type: 'prepend';
  items: Expression;
  to: string;
}

export interface CallFunctionAction {
  type: 'call_function';
  name: string;
  args?: Expression[];
}

export interface Calculation {
  name: string;
  inputs: string[];
  expression: Expression;
}

export interface Validation {
  name: string;
  checks: ValidationCheck[];
}

export interface ValidationCheck {
  condition: Expression;
  error: string;
}

// ============================================================================
// State Machines
// ============================================================================

export interface StateMachine {
  name: string;
  states: string[];
  initial: string;
  transitions: Transition[];
}

export interface Transition {
  from: string;
  to: string;
  when?: Expression;
  action?: Action | Action[];
  cooldown?: string;
}

// ============================================================================
// Real-time Connections
// ============================================================================

export interface RealtimeConnection {
  name: string;
  url: string;
  onConnected?: Action[];
  onDisconnected?: Action[];
  subscriptions: Subscription[];
  heartbeat?: string;
  reconnectPolicy?: ReconnectPolicy;
}

export interface Subscription {
  channel: string;
  filter?: Expression;
  onMessage: MessageHandler;
}

export interface MessageHandler {
  paramName: string;
  actions: Action[];
}

export type ReconnectPolicy =
  | 'exponential_backoff'
  | { exponential_backoff: { max: string } }
  | { fixed_interval: string }
  | 'none';

// ============================================================================
// External Integrations
// ============================================================================

export interface ExternalIntegration {
  name: string;
  type: 'auth_provider' | 'payments' | 'analytics' | 'email' | 'monitoring' | 'storage' | 'other';
  sdk?: string;
  provides?: string[];
  events?: IntegrationEvent[];
  webhooks?: Webhook[];
}

export interface IntegrationEvent {
  eventName: string;
  paramName?: string;
  actions: Action[];
}

export interface Webhook {
  name: string;
  verify: 'stripe_signature' | 'github_signature' | 'hmac_sha256' | 'bearer_token' | 'custom';
  handlers: WebhookHandler[];
}

export interface WebhookHandler {
  event: string;
  actions: Action[];
}

// ============================================================================
// Integrations (API/Database/Auth)
// ============================================================================

export interface IntegrationsSection {
  apis?: ApiIntegration[];
  database?: DatabaseConfig;
  auth?: AuthConfig;
}

export interface ApiIntegration {
  name: string;
  endpoint: string;
  methods: ApiMethod[];
}

export interface ApiMethod {
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: Record<string, string>;
  body?: string;
  returns?: string;
}

export interface DatabaseConfig {
  provider: 'supabase' | 'postgres' | 'mysql';
  tables: string[];
}

export interface AuthConfig {
  provider: 'supabase' | 'auth0' | 'custom';
  methods: string[];
}

// ============================================================================
// Deploy Configuration
// ============================================================================

export interface DeployConfig {
  platform: 'vercel' | 'netlify' | 'railway';
  environments: Record<string, EnvironmentConfig>;
}

export interface EnvironmentConfig {
  url: string;
}

// ============================================================================
// Expressions
// ============================================================================

export type Expression =
  | string
  | number
  | boolean
  | { var: string }
  | { call: string; args: Expression[] }
  | { binary: { left: Expression; op: BinaryOp; right: Expression } }
  | { unary: { op: UnaryOp; operand: Expression } };

export type BinaryOp =
  | '+'
  | '-'
  | '*'
  | '/'
  | '=='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | '&&'
  | '||';

export type UnaryOp = '!' | '-';

// ============================================================================
// APML-EDU Extensions (v2.1.0)
// ============================================================================

// ----------------------------------------------------------------------------
// Content - Pedagogical Content Hierarchies
// ----------------------------------------------------------------------------

export interface ContentDefinition {
  name: string;
  type: 'course' | 'module' | 'lesson' | 'seed' | 'lego' | 'basket' | 'phrase';
  id?: string;
  fields?: ContentField[];
  structure?: ContentStructure;
  audio?: ContentAudio;
}

export interface ContentField {
  name: string;
  type: string;
  required?: boolean;
  default?: any;
}

export interface ContentStructure {
  contains?: string;
  extracts?: string;
  when?: ConditionalStructure[];
  has_basket?: boolean;
}

export interface ConditionalStructure {
  condition: Expression;
  has_components?: string;
}

export interface ContentAudio {
  [key: string]: string; // e.g., known_audio: "AudioSample"
}

// ----------------------------------------------------------------------------
// Methodology - Learning Rules
// ----------------------------------------------------------------------------

export interface MethodologyDefinition {
  name: string;
  description?: string;
  triggers_when?: Expression;
  sequence?: MethodologySequence[];
  schedule?: MethodologySchedule[];
  parameters?: MethodologyParameter[];
  timing?: MethodologyTiming;
  voices?: MethodologyVoices;
  adaptation?: MethodologyAdaptation[];
  constraints?: MethodologyConstraints;
}

export interface MethodologySequence {
  step: number;
  action: string;
  content?: string;
  methodology?: string;
  interleave?: boolean;
  when?: Expression;
}

export interface MethodologySchedule {
  offset: number;
  cycles: number;
}

export interface MethodologyParameter {
  name: string;
  type: string;
  default?: any;
  options?: any[];
}

export interface MethodologyTiming {
  cycle_pause?: string;
  response_pause?: string;
  echo_pause?: string;
}

export interface MethodologyVoices {
  known?: string;
  target?: string;
  cadence_known?: 'natural' | 'slow' | 'fast';
  cadence_target?: 'natural' | 'slow' | 'fast';
}

export interface MethodologyAdaptation {
  condition: Expression;
  actions: AdaptationAction[];
}

export interface MethodologyConstraints {
  atomic?: boolean;
  min_duration?: string;
  max_duration?: string;
}

// ----------------------------------------------------------------------------
// Production - Runtime Learner Activity
// ----------------------------------------------------------------------------

export interface ProductionDefinition {
  name: string;
  type: 'cycle' | 'set' | 'session';
  atomic?: boolean;
  structure?: ProductionStructure[];
  contains?: string;
  bounded_by?: string;
  tracks?: ProductionTracking;
  lifecycle?: ProductionLifecycle;
  storage?: ProductionStorage;
  timing?: ProductionTiming;
}

export interface ProductionStructure {
  step: number;
  name: string;
  audio?: string;
  display?: string;
  duration?: string;
  purpose?: string;
  cadence?: 'natural' | 'slow' | 'fast';
}

export interface ProductionTracking {
  [key: string]: string; // e.g., cycle_id: "generated"
}

export interface ProductionLifecycle {
  on_start?: Action[];
  on_pause?: Action[];
  on_resume?: Action[];
  on_complete?: Action[];
}

export interface ProductionStorage {
  local?: string;
  remote?: string;
}

export interface ProductionTiming {
  total_estimated?: string;
}

// ----------------------------------------------------------------------------
// Audio - Audio Pipeline Configuration
// ----------------------------------------------------------------------------

export interface AudioConfiguration {
  voices?: VoiceDefinition[];
  samples?: AudioSampleConfig;
  generation?: AudioGenerationConfig;
  compilation?: AudioCompilationConfig;
  pipeline?: AudioPipelinePhase[];
}

export interface VoiceDefinition {
  id: string;
  role: 'source' | 'target1' | 'target2' | 'presentation' | 'encouragement' | 'instructor' | 'target_primary' | 'target_echo';
  provider: 'azure' | 'elevenlabs' | 'google' | 'human';
  language: string;
}

export interface AudioSampleConfig {
  storage?: AudioStorageConfig;
  registry?: AudioRegistryConfig;
  uuid_generation?: AudioUUIDConfig;
}

export interface AudioStorageConfig {
  provider: 'S3' | 'Supabase' | 'local';
  bucket?: string;
  region?: string;
  path_template?: string;
}

export interface AudioRegistryConfig {
  provider: 'Supabase' | 'PostgreSQL';
  table?: string;
}

export interface AudioUUIDConfig {
  method: 'deterministic' | 'random';
  hash?: string;
}

export interface AudioGenerationConfig {
  default_provider?: 'azure' | 'elevenlabs' | 'google';
  providers?: string[];
  cadences?: AudioCadenceConfig;
}

export interface AudioCadenceConfig {
  slow?: CadenceSettings;
  natural?: CadenceSettings;
  fast?: CadenceSettings;
}

export interface CadenceSettings {
  azure_speed?: number;
  time_stretch?: number;
  normalize?: boolean;
}

export interface AudioCompilationConfig {
  deterministic_uuid?: string;
}

export interface AudioPipelinePhase {
  phase: number;
  name: string;
  port?: number;
  input?: string;
  output?: string;
  requires?: string;
}

// ----------------------------------------------------------------------------
// Parameters - Scoped Configuration
// ----------------------------------------------------------------------------

export interface ParameterScope {
  scope: 'system' | 'language_pair' | 'course' | 'session' | 'learner';
  name?: string;
  parameters?: ParameterDefinition[];
  inheritance?: string;
  overrides?: ParameterOverride[];
}

export interface ParameterDefinition {
  name: string;
  type: string;
  default?: any;
  description?: string;
}

export interface ParameterOverride {
  target: string;
  reason?: string;
  parameters: Record<string, any>;
}

// ----------------------------------------------------------------------------
// Adaptation - Dynamic Learning Adjustments
// ----------------------------------------------------------------------------

export interface AdaptationRule {
  name: string;
  observe?: string;
  thresholds?: AdaptationThreshold[];
  when?: AdaptationCondition[];
  triggers?: AdaptationTriggers;
  adjustments?: AdaptationAdjustment[];
  exit_when?: Expression;
}

export interface AdaptationThreshold {
  name: string;
  value: number;
}

export interface AdaptationCondition {
  condition: Expression;
  actions: AdaptationAction[];
}

export interface AdaptationAction {
  type: 'increase' | 'decrease' | 'apply' | 'enable' | 'log' | 'add' | 'extend' | 'reduce';
  target: string;
  by?: number | string;
  min?: number;
  max?: number;
  value?: any;
}

export interface AdaptationTriggers {
  on_high_performance?: AdaptationAction[];
  on_low_performance?: AdaptationAction[];
}

export interface AdaptationAdjustment {
  parameter: string;
  value: any;
}

// ----------------------------------------------------------------------------
// Difficulty Profiles (for adaptation)
// ----------------------------------------------------------------------------

export interface DifficultyProfile {
  name: 'easy' | 'normal' | 'challenging';
  speed_multiplier?: number;
  debu_count?: number;
  pause_multiplier?: number;
  eter_schedule?: string;
}

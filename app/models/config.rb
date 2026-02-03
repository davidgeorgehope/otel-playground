class Config < ApplicationRecord
  before_create :generate_share_token

  validates :name, presence: true
  validates :pipeline_data, presence: true

  AVAILABLE_TAGS = %w[kubernetes docker logs traces metrics production development monitoring alerting].freeze

  def parsed_pipeline_data
    JSON.parse(pipeline_data || '{}')
  rescue JSON::ParserError
    {}
  end

  def parsed_tags
    JSON.parse(tags || '[]')
  rescue JSON::ParserError
    []
  end

  def pipeline_summary
    data = parsed_pipeline_data
    return "" unless data["pipelines"]

    receivers = Set.new
    processors = Set.new
    exporters = Set.new

    data["pipelines"].each do |_, pipeline|
      (pipeline["receivers"] || []).each { |c| receivers << (c["type"] || c["id"]) }
      (pipeline["processors"] || []).each { |c| processors << (c["type"] || c["id"]) }
      (pipeline["exporters"] || []).each { |c| exporters << (c["type"] || c["id"]) }
    end

    parts = []
    parts << "#{receivers.size} receiver#{'s' if receivers.size != 1}" if receivers.any?
    parts << "#{processors.size} processor#{'s' if processors.size != 1}" if processors.any?
    parts << "#{exporters.size} exporter#{'s' if exporters.size != 1}" if exporters.any?
    parts.join(" → ")
  end

  def component_names
    data = parsed_pipeline_data
    return { receivers: [], processors: [], exporters: [] } unless data["pipelines"]

    result = { receivers: Set.new, processors: Set.new, exporters: Set.new }
    data["pipelines"].each do |_, pipeline|
      (pipeline["receivers"] || []).each { |c| result[:receivers] << (c["type"] || c["id"]) }
      (pipeline["processors"] || []).each { |c| result[:processors] << (c["type"] || c["id"]) }
      (pipeline["exporters"] || []).each { |c| result[:exporters] << (c["type"] || c["id"]) }
    end
    result.transform_values(&:to_a)
  end

  def generate_yaml
    self.yaml_output = YamlGenerator.new(parsed_pipeline_data).generate
  end

  private

  def generate_share_token
    self.share_token ||= SecureRandom.alphanumeric(8).downcase
  end
end

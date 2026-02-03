class Config < ApplicationRecord
  before_create :generate_share_token

  validates :name, presence: true
  validates :pipeline_data, presence: true

  def parsed_pipeline_data
    JSON.parse(pipeline_data || '{}')
  rescue JSON::ParserError
    {}
  end

  def generate_yaml
    self.yaml_output = YamlGenerator.new(parsed_pipeline_data).generate
  end

  private

  def generate_share_token
    self.share_token ||= SecureRandom.alphanumeric(8).downcase
  end
end

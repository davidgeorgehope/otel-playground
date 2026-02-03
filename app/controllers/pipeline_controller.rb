class PipelineController < ApplicationController
  skip_before_action :verify_authenticity_token, only: [:generate_yaml]

  def builder
    @template = params[:template]
  end

  def templates
  end

  def generate_yaml
    begin
      # Get the raw JSON body and parse it ourselves
      body = request.body.read
      parsed = JSON.parse(body)
      pipeline_data = parsed["pipeline_data"]

      if pipeline_data.is_a?(String)
        pipeline_data = JSON.parse(pipeline_data)
      end

      generator = YamlGenerator.new(pipeline_data)
      render plain: generator.generate, content_type: "text/plain"
    rescue => e
      render plain: "# Error generating YAML: #{e.message}", content_type: "text/plain", status: 200
    end
  end
end

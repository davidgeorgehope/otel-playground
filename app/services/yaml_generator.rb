class YamlGenerator
  def initialize(pipeline_data)
    @data = pipeline_data.is_a?(String) ? JSON.parse(pipeline_data) : (pipeline_data || {})
  rescue JSON::ParserError
    @data = {}
  end

  def generate
    return "# Add components to your pipeline to generate config\n" if @data.nil? || @data.empty?

    pipelines = @data["pipelines"] || {}
    return "# Add components to your pipeline to generate config\n" if pipelines.empty?

    receivers_config = {}
    processors_config = {}
    exporters_config = {}
    connectors_config = {}
    service_pipelines = {}

    pipelines.each do |pipeline_type, pipeline|
      next unless pipeline.is_a?(Hash)

      %w[receivers processors exporters connectors].each do |category|
        components = pipeline[category] || []
        target = case category
                 when "receivers" then receivers_config
                 when "processors" then processors_config
                 when "exporters" then exporters_config
                 when "connectors" then connectors_config
                 end

        components.each do |comp|
          next unless comp.is_a?(Hash)
          key = comp["id"] || comp["type"]
          settings = comp["settings"]
          target[key] = settings.is_a?(Hash) ? deep_clean(settings) : nil
        end
      end

      pipeline_key = pipeline_type.to_s
      entry = {}
      %w[receivers processors exporters].each do |role|
        ids = (pipeline[role] || []).map { |c| c.is_a?(Hash) ? (c["id"] || c["type"]) : c.to_s }.compact
        entry[role] = ids if ids.any?
      end
      service_pipelines[pipeline_key] = entry
    end

    lines = []

    { "receivers" => receivers_config, "processors" => processors_config,
      "exporters" => exporters_config, "connectors" => connectors_config }.each do |section_name, config|
      next if config.empty?
      lines << "#{section_name}:"
      config.each do |key, settings|
        if settings.is_a?(Hash) && !settings.empty?
          lines << "  #{key}:"
          lines << render_hash(settings, 4)
        else
          lines << "  #{key}:"
        end
      end
      lines << ""
    end

    if service_pipelines.any?
      lines << "service:"
      lines << "  pipelines:"
      service_pipelines.each do |ptype, entry|
        lines << "    #{ptype}:"
        entry.each do |role, ids|
          lines << "      #{role}: [#{ids.join(', ')}]"
        end
      end
    end

    lines.reject(&:nil?).join("\n") + "\n"
  end

  private

  def deep_clean(hash)
    return {} unless hash.is_a?(Hash)
    result = {}
    hash.each do |key, value|
      case value
      when Hash
        # Keep empty hashes - they are meaningful in OTel config (e.g., scrapers: cpu: {})
        result[key] = deep_clean(value)
      when Array
        result[key] = value
      when nil, ""
        next
      else
        result[key] = value
      end
    end
    result
  end

  def render_hash(hash, indent)
    return "" unless hash.is_a?(Hash)
    lines = []
    prefix = " " * indent

    hash.each do |key, value|
      case value
      when Hash
        if value.empty?
          lines << "#{prefix}#{key}:"
        else
          lines << "#{prefix}#{key}:"
          lines << render_hash(value, indent + 2)
        end
      when Array
        if value.empty?
          next
        elsif value.all? { |v| !v.is_a?(Hash) && !v.is_a?(Array) }
          formatted = value.map { |v| format_value(v) }.join(", ")
          lines << "#{prefix}#{key}: [#{formatted}]"
        else
          lines << "#{prefix}#{key}:"
          value.each do |item|
            if item.is_a?(Hash)
              keys = item.keys
              if keys.any?
                lines << "#{prefix}  - #{keys[0]}: #{format_value(item[keys[0]])}"
                keys[1..].each do |k|
                  lines << "#{prefix}    #{k}: #{format_value(item[k])}"
                end
              end
            else
              lines << "#{prefix}  - #{format_value(item)}"
            end
          end
        end
      when true, false
        lines << "#{prefix}#{key}: #{value}"
      when Integer, Float
        lines << "#{prefix}#{key}: #{value}"
      when String
        lines << "#{prefix}#{key}: #{format_value(value)}"
      else
        lines << "#{prefix}#{key}: #{value}"
      end
    end

    lines.join("\n")
  end

  def format_value(value)
    case value
    when true, false then value.to_s
    when Integer, Float then value.to_s
    when Hash then "{}"
    when String
      needs_quotes = value.match?(/^\d+$/) || value.include?(":") || value.include?(" ") ||
                     value.include?("#") || value.include?("*") || value.include?("/") ||
                     value.include?("{") || value.include?("}") || value.empty?
      return "\"#{value}\"" if needs_quotes
      return value if value.match?(/^\d+(\.\d+)?(ms|s|m|h)$/)
      value
    else
      value.to_s
    end
  end
end

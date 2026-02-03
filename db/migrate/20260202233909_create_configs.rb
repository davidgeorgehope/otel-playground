class CreateConfigs < ActiveRecord::Migration[8.1]
  def change
    create_table :configs do |t|
      t.string :name, null: false
      t.text :description
      t.text :pipeline_data
      t.text :yaml_output
      t.string :share_token, null: false
      t.integer :views_count, default: 0

      t.timestamps
    end
    add_index :configs, :share_token, unique: true
  end
end
